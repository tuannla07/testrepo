<?php

/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

namespace Piwik\Plugins\OmniaSSO;

use Piwik\Piwik;
use Piwik\Settings\FieldConfig;
use Piwik\Settings\Plugin\SystemSetting;
use Piwik\Validators\UrlLike;


class SystemSettings extends \Piwik\Settings\Plugin\SystemSettings
{

    public $clientId;
    public $clientSecret;
    public $omniaUrl;
    public $omniaOverrideUrl;


    protected function init()
    {
        $this->clientId = $this->createClientIdSetting();
        $this->clientSecret = $this->createClientSecretSetting();
        $this->omniaUrl = $this->createOmniaUrlSetting();
        $this->omniaOverrideUrl = $this->createOmniaOverrideUrlSetting();
    }


    private function createClientIdSetting() : SystemSetting
    {
        return $this->makeSetting("clientId", $default = "", FieldConfig::TYPE_STRING, function(FieldConfig $field) {
        });
    }

    private function createClientSecretSetting() : SystemSetting
    {
        return $this->makeSetting("clientSecret", $default = "", FieldConfig::TYPE_STRING, function(FieldConfig $field) {
        });
    }

    private function createOmniaUrlSetting() : SystemSetting
    {
        return $this->makeSetting("omniaUrl", $default = "", FieldConfig::TYPE_STRING, function(FieldConfig $field) {
        });
    }

    private function createOmniaOverrideUrlSetting() : SystemSetting
    {
        return $this->makeSetting("omniaOverrideUrl", $default = "", FieldConfig::TYPE_STRING, function(FieldConfig $field) {
            $field->title = Piwik::translate("OmniaSSO_OverrideOmniaUrl");
            $field->description = Piwik::translate("OmniaSSO_OverideOmniaUrlHelp");
            $field->uiControl = FieldConfig::UI_CONTROL_URL;
            $field->validators[] = new UrlLike();
        });
    }
}
