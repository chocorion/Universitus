
class Characteristic() :

    def __init__(self, name, value) :
        self.name = name
        self.value = value

    def toString(self):
        return "    self."+ self.name + " = " + self.value

class HP(Characteristic):
    def __init__(self, value) :
        Characteristic.__init__(self,"HP",value)