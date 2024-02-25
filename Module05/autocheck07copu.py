def formatted_numbers():
    result = []
    result.append("|{:^10}|{:^10}|{:^10}|".format("decimal","hex","binary"))
    # print("|{:<}|{:*^}|{:>}|".format("decimal", "hex", "binary"))
    
    for el in range(16):
        table = "|{0:<10d}|{0:^10x}|{0:>10b}|".format(el)
        result.append(table)
        # print(table)
    return result

for el in formatted_numbers():
    print(el)