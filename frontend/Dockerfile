FROM node:20-alpine

WORKDIR /app

# Copiar archivos de definición de paquetes
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Ejecutar en modo desarrollo permitiendo conexiones externas
CMD ["npm", "run", "dev", "--", "--host"]
