def read_employees_from_file(path):
    fh = open(path, 'r')
    lines = fh.readlines()
   
    fh.close()
    newlist = []
    for elements in lines:
        up_lines = elements.replace('\n', '')
        newlist.append(up_lines)
        
    return newlist