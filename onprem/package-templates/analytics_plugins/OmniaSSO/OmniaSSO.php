<?php

/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

namespace Piwik\Plugins\OmniaSSO;

use Piwik\FrontController;
use Piwik\Url;
use Piwik\Piwik;

class OmniaSSO extends \Piwik\Plugin
{

    public function registerEvents() : array
    {
        return array(
            "Template.loginNav" => "renderLoginMod",
            "Template.confirmPasswordContent" => "renderLoginRequirePassword",
            "Login.userRequiresPasswordConfirmation" => "userRequiresPasswordConfirmation",
            "AssetManager.getStylesheetFiles" => "getStylesheetFiles"
        );
    }

    public function beforeSessionStart() : void
    {
    }

    public function getStylesheetFiles(&$files)
    {
        $files[] = "plugins/OmniaSSO/styles/customstyles.css";
    }
    
    private function getCurrentUrl() : string{
        return "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];   
    }

    public function renderLoginMod(string &$out, string $payload = null)
    {
        $this->doRedirectToUrl("OmniaSSO", "index", parameters:array("redirectUrl" => urlencode($this->getCurrentUrl()) ));
    }

    public function renderLoginRequirePassword(string &$out, string $payload = null) : void
    {
        if (!empty($payload) && $payload === "bottom") {
            $content = FrontController::getInstance()->dispatch("OmniaSSO", "loginMod");
            if (!empty($content)) {
                $out .= $content;
            }
        }
    }
    public function userRequiresPasswordConfirmation(&$requiresPasswordConfirmation, $login) : void
    {

        $requiresPasswordConfirmation = false;
    }

    private function doRedirectToUrl($moduleToRedirect, $actionToRedirect, $parameters = array())
    {
        $parameters = array_merge(
            $parameters
        );
        $queryParams = !empty($parameters) ? '&' . Url::getQueryStringFromParameters($parameters) : '';
        $url = "index.php?module=%s&action=%s";
        $url = sprintf($url, $moduleToRedirect, $actionToRedirect);
        $url = $url . $queryParams;
        Url::redirectToUrl($url);
    }
}