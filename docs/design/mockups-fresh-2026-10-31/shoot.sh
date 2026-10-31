for p in index guides blackjack trainer drill 404; do
/usr/local/bin/chromium --headless=new --no-sandbox --hide-scrollbars --window-size=1440,${H:-2600} --screenshot=$PWD/shots/$p-desktop.png file://$PWD/$p.html 2>/dev/null
/usr/local/bin/chromium --headless=new --no-sandbox --hide-scrollbars --window-size=390,${M:-4200} --screenshot=$PWD/shots/$p-phone.png file://$PWD/$p.html 2>/dev/null
done
