<?php

/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

namespace Piwik\Plugins\OmniaSSO;

use Piwik\Container\StaticContainer;
use Piwik\Exception\Exception;
use Piwik\Plugins\SitesManager\Model as SitesManagerModel;
use Piwik\Plugins\UsersManager\Model as UsersManagerModel;
use Piwik\Log;
use Piwik\Url;
use Piwik\Nonce;
use Piwik\Piwik;
use Psr\Log\LoggerInterface;

class Controller extends \Piwik\Plugins\Login\Controller
{
    const PLUGIN_AUTH_PATH = "Piwik\Plugins\OmniaSSO\Auth";
    const PLUGIN_PASSWORDVERIFIER_PATH = "Piwik\Plugins\Login\PasswordVerifier";
    private $userModel;
    private $siteModel;
    private $api;
    const CSRF_NONCE = "OmniaSSO.nonce";

    protected $passwordVerify;

    public function __construct(
        $passwordResetter = null,
        $auth = null,
        $sessionInitializer = null,
        $passwordVerify = null,
        $bruteForceDetection = null,
        $systemSettings = null
    )
    {
        if (empty($auth)) {
            $auth = StaticContainer::get(self::PLUGIN_AUTH_PATH);
        }
        $this->auth = $auth;
        $this->userModel = new UsersManagerModel();
        $this->siteModel = new SitesManagerModel();
        
        if (empty($passwordVerify)) {
            $passwordVerify = StaticContainer::get(self::PLUGIN_PASSWORDVERIFIER_PATH);
        }
        $this->passwordVerify = $passwordVerify;

        parent::__construct($passwordResetter, $auth, $sessionInitializer, $passwordVerify, $bruteForceDetection, $systemSettings);
    }

    public function index()
    {
        $this->autoLogin();
    }

    public function autoLogin()
    {
		$logger = StaticContainer::get(LoggerInterface::class);
		
        $settings = new \Piwik\Plugins\OmniaSSO\SystemSettings();
        $redirectUrl = $settings->omniaUrl->getValue() . "/spsignin?redirectUrl=" . urlencode($this->getRedirectUrl());
        if(!isset($_COOKIE["OmniaTokenKey"])){
            Url::redirectToUrl($redirectUrl);
        }

        $username = $this->getUsernameFromOmniaCookie();
        if (empty($username)) {
            Url::redirectToUrl($redirectUrl);
        }
		
		$logger->error('UserName : ' . $username);


        $user = $this->userModel->getUser($username);
        if (empty($user['login'])) {
            $this->throwError("Omnia SSO - Matomo user not found");
        }
        $this->autoLoginAs($user['login']);
    }
    

    private function autoLoginAs($username): void
    {
        $this->authenticateAndRedirect($username, "", $this->getRedirectUrl());
    }
    
    private function getRedirectUrl() : string{
        if(isset($_REQUEST["redirectUrl"])){
            return $_REQUEST["redirectUrl"];
        }

        return "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];   
    }

    private function getOmniaUrl() : string {
        $settings = new \Piwik\Plugins\OmniaSSO\SystemSettings();
        
        if(isset($settings->omniaOverrideUrl) && !empty($settings->omniaOverrideUrl->getValue())){
            return $settings->omniaOverrideUrl->getValue();
        }
        return $settings->omniaUrl->getValue();
    }

    private function getUsernameFromOmniaCookie(): string {	
        $settings = new \Piwik\Plugins\OmniaSSO\SystemSettings();
        $omniaUrl = $settings->omniaUrl->getValue();
        
        $tokenString = "\"\"";
        $resolvedUserName = "";

        if(isset($_COOKIE["OmniaTokenKey"])) {
            $omniaToken =  $_COOKIE["OmniaTokenKey"];
			
            $omniaTokenObj = json_decode(base64_decode($omniaToken));
            if(!empty($omniaTokenObj->tokenKey)) {
                $tokenString = "\"" . $omniaTokenObj->tokenKey . "\"";
            }
        }
		
        // Make call to omnia and verify user is logged in or not
        $curl = $this->getCurlInit($omniaUrl . "/api/auth/validation", $tokenString);
        $response = curl_exec($curl);
        $result = json_decode($response);
        curl_close($curl);

        if (empty($result) || empty($result->data)) {
            $this->throwError("Omnia SSO - Error on step 1");
        }

        // Token is validated now get the resolved user
        if($result->data->status == 0){
            $identity = $result->data->identity;
            $identityAsString = $identity->id . "[" . $identity->type . "]";
            $postData = "[" . json_encode($identity) . "]";

            // Make another CURL to get the resolved Identity out
            $curl = $this->getCurlInit($omniaUrl . "/api/identity/resolveidentities", $postData);
            $response = curl_exec($curl);
            curl_close($curl);

            $result = json_decode($response);
            if (empty($result) || empty($result->data)) {
                $this->throwError("Omnia SSO - Error on step 2");
            }
            $resolvedUser = $result->data->$identityAsString;
            if(empty($resolvedUser) || empty($resolvedUser->username) || empty($resolvedUser->username->value->text)) {
                $this->throwError("Omnia SSO - Error on step 3");
            }
            $resolvedUserName = $resolvedUser->username->value->text;
        }

        // External users might have #EXT# in their username so we need to replace it with _xEXTx_
        // Users created in matomo will have that already replaced
        $search =["#EXT#", "\\"];
		$replace = ["_xEXTx_", "__"];
		
        return str_replace($search, $replace, $resolvedUserName);
    }

    private function throwError(string $message){
        $e = new \Piwik\Exception\Exception(throw new Exception($message));
        $e->setIsHtmlMessage();
        throw $e;
    }

    private function getCurlInit(string $url, string $postData){
        $settings = new \Piwik\Plugins\OmniaSSO\SystemSettings();
        $clientId = $settings->clientId->getValue();
        $clientSecret = $settings->clientSecret->getValue();

        $curl = curl_init();
            curl_setopt($curl, CURLOPT_POST, 1);
            curl_setopt($curl, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                "ClientId: " . $clientId,
                "ClientSecret: " . $clientSecret,
                "Content-Type: application/json"
            ));
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($curl, CURLOPT_SSL_VERIFYSTATUS, false);
            curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, 0);

        return $curl;
    }

    public function loginMod() : string
    {
        return $this->renderTemplate("loginMod", array(
            "caption" => Piwik::translate("OmniaSSO_AuthorizeWithOmnia"),
            "nonce" => Nonce::getNonce(self::CSRF_NONCE)
        ));
    }

    public function validateAuth()
    {        
        // csrf protection
        Nonce::checkNonce(self::CSRF_NONCE, $_POST["form_nonce"]);

        $username = $this->getUsernameFromOmniaCookie();
        if (empty($username)) {
            return;
        }
        else{
            $this->passwordVerify->setPasswordVerifiedCorrectly();
            return;
        }

    }
}
