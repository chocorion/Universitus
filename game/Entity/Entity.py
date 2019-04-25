import os

class Entity:
    baseDir = os.path.abspath(os.getcwd())

    def __init__(self, name, worldPath) :
        self.worldPath = worldPath
        self.name = name
        self.path = os.path.abspath(self.baseDir+"/world/"+self.worldPath+"/"+self.name+".py")

    def exists(self):
        exist = os.path.isfile(self.path)
        return exist

    def create(self):
        open(self.path,'a').close()

    def remove(self):
        if os.path.isfile(self.path):
            os.remove(self.path)

    def writeIn(self,text):
        with open(self.path,'a') as f:
            f.write(text+"\n")