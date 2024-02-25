import pathlib
def write_employees_to_file(employee_list, path):
    fh = open(path, 'w+')
    for el in employee_list:
        fh.write(f'{el}' + '\n')




