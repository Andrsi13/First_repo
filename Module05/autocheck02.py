import re

phone = "    +38(050)123-32-34 "
 
def sanitize_phone_number(phone):
    number = phone.replace("(", "").replace("-", "").replace(")", "").replace("+", "")
    res = number.split()

    return res

print(sanitize_phone_number(phone))