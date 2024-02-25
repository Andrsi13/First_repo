import re


def find_word(text, word):
    new_dict = {}
    res = re.search(word, text)
    
    if res:
        new_dict["result"] = True
        new_dict['first_index'] = res.span()[0]
        new_dict['last_index'] = res.span()[1]

    else:
        new_dict["result"] = False
        new_dict['first_index'] = None
        new_dict['last_index'] = None
    new_dict['search_string'] = word
    new_dict['string'] = text
    

    return new_dict





a = "Guido van Rossum began working on Python in the late 1980s, as a successor to the ABC programming language, and first released it in 1991 as Python 0.9.0."
b = "python"
print(find_word(a, b))