

def lookup_key(data, value):
    a = []

    for key, i in data.items():
        if i == value:
            a.append(key)
    return a


print(lookup_key({'key1': 1, 'key2': 2, 'key3': 3, 'key4': 2}, 2))
