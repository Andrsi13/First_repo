def all_sub_lists(data):
    sublists = [[]]  
    for length in range(1, len(data) + 1):  
        for i in range(0, len(data) - length + 1):  
            #print(length)
            print(i)
         #   sublists.append(data[i: i + length])  
    
    #return sublists




a = [4, 6, 1, 3]
print(all_sub_lists(a))


[[], [4], [4, 6], [4, 6, 1], [4, 6, 1, 3], [6], [6, 1], [6, 1, 3], [1], [1, 3], [3]]
[[], [4], [6], [1], [3], [4, 6], [6, 1], [1, 3], [4, 6, 1], [6, 1, 3], [4, 6, 1, 3]]