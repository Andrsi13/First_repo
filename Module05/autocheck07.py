print('|'+ f'{"decimal":^10}' + '|' + f'{"hex":^10}' + '|'+ f'{"binary":^10}' + '|')

def formatted_numbers():
    new_list = []
    for numbers in range(16):
        new_list.append('|'+ f'{numbers:<10}' + '|' + f'{f"{numbers:x}":^10}' + '|'+ f'{f"{numbers:b}":>10}' + '|')
    return new_list

for el in formatted_numbers():
    print(el)