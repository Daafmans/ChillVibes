param([string]$Query = "")
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$url = "file:///C:/Users/daafm/chillvibes/ChillVibes/tools/test.html$Query"
Start-Process -FilePath $edge -ArgumentList "--headless=new","--disable-gpu","--virtual-time-budget=60000","--dump-dom",$url -RedirectStandardOutput "$env:TEMP\cv_out.txt" -RedirectStandardError "$env:TEMP\cv_err.txt" -Wait -NoNewWindow | Out-Null
(Get-Content "$env:TEMP\cv_out.txt" -Raw) -replace '(?s).*<pre id="out">','' -replace '(?s)</pre>.*',''
