import re


def find_all_words(text, word):
    search = re.findall(word, text, flags=re.IGNORECASE)

    return search

    