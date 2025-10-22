$publicCertPath = "C:\certs\wildcard_adventrix2019_com_2021.cer"
$trustName = "Omnia"
$issuerId = "29ed42a8-1e0f-4af8-8f91-893501466b74"

if ([string]::IsNullOrEmpty($issuerId))
{
	$issuerId = [System.Guid]::NewGuid().ToString()
}

$certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($publicCertPath)
New-SPTrustedRootAuthority -Name $trustName -Certificate $certificate 
$realm = Get-SPAuthenticationRealm
$fullIssuerIdentifier = $issuerId + '@' + $realm 
New-SPTrustedSecurityTokenIssuer -Name $issuerId -Certificate $certificate -RegisteredIssuerName $fullIssuerIdentifier -IsTrustBroker
iisreset

#For debug only, if the app runs in debug mode, these below commands should be uncommented to allow over http. Otherwise, it should have a 403 Forbidden error. 
#$serviceConfig = Get-SPSecurityTokenServiceConfig
#$serviceConfig.AllowOAuthOverHttp = $true
#$serviceConfig.Update()

write-host 
write-host "-------------------------------------------------------------"
write-host 
write-host "Issuer ID:" $issuerId
write-host "Registered Issuer Name:" $fullIssuerIdentifier
write-host 
write-host "-------------------------------------------------------------"
write-host 