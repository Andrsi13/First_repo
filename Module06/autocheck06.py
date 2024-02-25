import pathlib

def save_applicant_data(source : list [dict], output):
    list = []
    for person in source:
        person_data = []
        person_data.append(person.get('name'))
        person_data.append(person.get('specialty'))
        person_data.append(person.get('math'))
        person_data.append(person.get('lang'))
        person_data.append(person.get('eng'))
        cleaned_data = ','.join(map(str, person_data))
        list.append(cleaned_data)
    with open(output, 'w') as fh:
        for el in list:
            fh.write(el +'\n')
    return list





a = [
    {
        "name": "Kovalchuk Oleksiy",
        "specialty": 301,
        "math": 175,
        "lang": 180,
        "eng": 155,
    },
    {
        "name": "Ivanchuk Boryslav",
        "specialty": 101,
        "math": 135,
        "lang": 150,
        "eng": 165,
    },
    {
        "name": "Karpenko Dmitro",
        "specialty": 201,
        "math": 155,
        "lang": 175,
        "eng": 185,
    },
]
b = 'output.txt'
print(save_applicant_data(a, b))
