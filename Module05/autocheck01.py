text = 'Alex\nKdfe23\t\f\v.\r'
def real_len(text):
    special_chars = {'\n', '\f', '\r', '\t', '\v'}  # Множина керівних символів
    count = 0
    for char in text:
        if char not in special_chars:
            count += 1
    return count

print(real_len(text))