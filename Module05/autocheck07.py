def formatted_numbers(a):
    new_list = []
    print('|'+ f'{"decimal":^10}' + '|' + f'{"hex":^10}' + '|'+ f'{"binary":^10}' + '|')
    for numbers in a:
        new_list.append('|'+ f'{numbers:<10}' + '|' + f'{f'{numbers:x}':^10}' + '|'+ f'{f'{numbers:b}':>10}' + '|')
    return new_list



a = range(16)
for el in formatted_numbers(a):
    print(el)

    