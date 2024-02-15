import re

alert = "Bot activity detected: 192.16.4.162, 69.168.21.323 looks"

r= r"\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}."


ips= re.findall(r, alert)

print(ips)