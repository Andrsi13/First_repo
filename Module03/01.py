

def convert_camel_to_snake(text):
    # CrazyFrogSound => crazy_frog_sound
    # iterate
    # 
    j = 0
    res = ""
    for char in text:
        if char.isupper():
            if j == 0:
                res += char.lower()
            else:
                res += "_" + char.lower()
        else:
            res = res + char
            j += 1
    return(res)
    pass




s = "CrazyFrogSound"

new_title = convert_camel_to_snake(s)
print(new_title)