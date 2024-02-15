ects = {"F": 1, "FX": 2, "E": 3, "D": 3, "C": 4, "B": 5, "A": 5 }
ects_desc = {"F": "Unsatisfactorily", "FX": "Unsatisfactorily", "E": "Enough", "D": "Satisfactorily", "C": "Good", "B": "Very good", "A": "Perfectly" }

def get_grade(key):
    grade = ects.get(key)
    return grade
    
    


def get_description(key):
    description = ects_desc.get(key)
    return description
    
        
        
        


print(get_grade("A"))
print(get_description("A"))    
      
        
    
    