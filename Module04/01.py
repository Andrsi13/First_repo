


def find_max_vowels(text):
    vowels = "aeiou"


    for ch in text:
        if ch not in vowels:
            text = text.replace(ch, ".")
    chains = text.split(".")
    print(text)
    print(chains)


text = "asdffgdf fdsfddsssasasddfaaaa s Oleeeeeeeh"
find_max_vowels(text)