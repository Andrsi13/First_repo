grades = {"A": 5, "B": 5, "C": 4, "D": 3, "E": 3, "FX": 2, "F": 1}
students = {"Nick": "A", "Olga": "B", "Mike": "FX", "Anna": "C"}


def get_grade(key):
    grade = grades.get(key)
    return grade


def formatted_grades(students):
    formatted_list = []
    count = 0
    for student, grade in students.items():
        point = get_grade(grade)
        count += 1
        formatted_list.append([count, student, grade, point])
    return formatted_list
    
        
for el in formatted_grades(students):
    print(f'{el[0]:>4}' + '|' + f'{el[1]:<11}' + '|' + f'{el[2]:^5}' + '|' + f'{el[3]:^5}')


#print(formatted_grades(students))
#print(names)
#print(name_grade)
#print(points)

