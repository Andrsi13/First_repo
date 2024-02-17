

def sanitize_phone_number(phone):
    
    new_phone = (
        phone.strip()
        .removeprefix("+")
        .replace("(", "")
        .replace(")", "")
        .replace("-", "")
        .replace(" ", "")
    )
    return new_phone


def get_phone_numbers_for_countries(list_phones):
    listUA = []
    listJP = []
    listTW = []
    listSG = []

    def sanitization():
        result = []
        for i in list_phones:
            result.append(sanitize_phone_number(i))
        return result

    sanitized_numbers = sanitization()

    for number in list_phones:
        if number.startswith("81"):
            listJP.append(number)
        elif number.startswith("65"):
            listSG.append(number)
        elif number.startswith("886"):
            listTW.append(number)
        else:
            listUA.append(number)
    return {"UA": listUA, "JP": listJP, "TW": listTW, "SG": listSG}

    
