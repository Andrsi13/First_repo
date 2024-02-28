from pathlib import Path

def get_employees_by_profession(path, profession):
    new_list = []
    with open(path, 'r') as fh:
        data = fh.readlines()
        #print(data)
        for line in data:
            if line.find(profession) != -1:
                new_line = line.strip()
                new_list.append(new_line)
        print(new_list)        
        result = '\n'.join(new_list)
        result = result.replace(profession, "")
    return result


file = "/Users/avlady/Desktop/GIT_Repo/First_repo/Module07/data.txt"     
prof = "cook"
print(get_employees_by_profession(file, prof))