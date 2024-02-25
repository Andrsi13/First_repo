import pathlib
def add_employee_to_file(record, path):
    fh = open(path, 'a')
    fh.write('\n' + record)
    fh.close()
    return


a = "Drake Mikelsson,19"
b = 'Module06/data.txt'

add_employee_to_file(a,b)