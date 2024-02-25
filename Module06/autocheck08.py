
import pathlib

def save_credentials_users(path, users_info):
    lines = []
    for key, value in users_info.items():
        line = f'{key}:{value}'
        lines.append(line.encode())
        
    with open(path, 'wb') as fh:
        fh.writelines(lines)

    return lines









a = {'andry':'uyro18890D', 'steve':'oppjM13LL9e'}
b = 'data.txt'

print(save_credentials_users(b,a))