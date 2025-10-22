Add-PSSnapin Microsoft.SharePoint.Powershell
 
# Enable Self Service Site Creation 
Write-Host "Enabling Self Service Site Creation..."
$WebApp = Get-SPWebApplication "https://omniaci.preciofishbone.se"
#sharepoint 2013 enable self service site creation powershell 
$webApp.SelfServiceSiteCreationEnabled = $true
$webApp.RequireContactForSelfServiceSiteCreation = $false
$webApp.Update()
Write-Host "DONE Enabling Self Service Site Creation"