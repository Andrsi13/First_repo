import re



def replace_spam_words(text, spam_words):
    for word in spam_words:
        mark = '*' * len(word)
        text = re.sub(word, mark, text, flags=re.IGNORECASE)
    return text



print(replace_spam_words("hello world", 'world'))
#p = re.sub(r'(blue|white|red)', 'color', 'blue socks and red shoes')
#print(p)  # color socks and color shoes