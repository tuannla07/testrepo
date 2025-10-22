param(
    [Parameter (Mandatory=$true)]
    [String] $ClientId,

    [Parameter (Mandatory=$true)]
    [String] $Weburl,

    [Parameter (Mandatory=$true)]
    [String] $SPRealmId
)

Add-Type -AssemblyName System.Web

[string]$appRedirectUrl = "/_layouts/15/appredirect.aspx?client_id=[CLIENT_ID]&amp;redirect_uri=[REDIRECT_URL]&amp;tsapp=1"

[string]$fullClientId = "i:0i.t|ms.sp.ext|" + $ClientId + "@" + $SPRealmId;
[string]$redirectUri = $Weburl + "/api/security/tokenkey?{StandardTokens}"

# Encode ClientId
[string]$encodedClientId = [uri]::EscapeDataString($fullClientId)
$encodedClientId = $encodedClientId.replace(".","%2E").replace("-","%2D")

# Encode redirect URL 
[string]$encodedRedirectUri = [uri]::EscapeDataString($redirectUri)
$encodedRedirectUri = $encodedRedirectUri.replace(".","%2E").replace("-","%2D")

# get final App redirtect url
$appRedirectUrl = $appRedirectUrl.Replace("[CLIENT_ID]",$encodedClientId).Replace("[REDIRECT_URL]",$encodedRedirectUri)

Write-Host $appRedirectUrl