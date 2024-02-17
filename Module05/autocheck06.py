grades = {"A": 5, "B": 5, "C": 4, "D": 3, "E": 3, "FX": 2, "F": 1}
students = {"Nick": "A", "Olga": "B", "Mike": "FX", "Anna": "C"}


def get_grade(key):
    grade = grades.get(key)
    return grade


def formatted_grades(students): #має повертати форматований список
    # index|Name   | grade | point
    count = 0
    new_list = []
    for name, grade in students.items():
        count += 1
        points = get_grade(grade)
        new_list.append(f'{count:>4}' + '|' + f'{name:<10}' + '|' + f'{grade:^5}' + '|' + f'{points:^5}')
    return new_list

for el in formatted_grades(students):
    print(el)

                                                

