# 📧 Email Hub Pro - Versión Streamlit

Una aplicación profesional para gestionar campañas de email, listas de contactos y configuraciones SMTP, ahora disponible en **Streamlit**.

## ✨ Características

✅ **Autenticación Segura** - Login y registro con Supabase
✅ **Gestión de Campañas** - Crear, programar y enviar campañas de email
✅ **Gestión de Listas** - Importar y administrar listas de emails
✅ **Configuración SMTP** - Configurar múltiples servidores SMTP
✅ **Validación de Emails** - Validar y detectar emails válidos
✅ **Dashboard Intuitivo** - Interfaz moderna y fácil de usar
✅ **Integración Supabase** - Base de datos en la nube

## 🚀 Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone https://github.com/chillshuazz/email-hub-pro.git
cd email-hub-pro
```

### 2. Crear un entorno virtual
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias
```bash
pip install -r streamlit_requirements.txt
```

### 4. Configurar variables de entorno
Crea o actualiza el archivo `.env` con tus credenciales de Supabase:

```bash
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="tu-clave-publica"
```

### 5. Ejecutar la aplicación
```bash
streamlit run streamlit_app.py
```

La aplicación se abrirá en `http://localhost:8501`

## 📋 Uso

### 1️⃣ Autenticación
- Crea una nueva cuenta o inicia sesión con Supabase
- Las credenciales se guardan de forma segura en Supabase

### 2️⃣ Dashboard
Panel de control con métricas principales:
- Total de campañas
- Total de listas
- Servidores SMTP configurados
- Emails enviados

### 3️⃣ Gestionar Campañas
- **Ver Campañas**: Visualiza todas tus campañas
- **Nueva Campaña**: Crea campañas con:
  - Nombre y asunto
  - Contenido HTML/Texto
  - Fecha y hora de envío
  - Lista de destinatarios

### 4️⃣ Gestionar Listas
- **Ver Listas**: Lista de todos los contactos
- **Nueva Lista**: Importa desde:
  - CSV con emails
  - Entrada manual (uno por línea)

### 5️⃣ Configurar SMTP
- Agregar servidores SMTP con validación automática
- Soporta Gmail, Outlook, SendGrid y más
- Verificación de conexión antes de guardar

### 6️⃣ Detectar Emails
- **Validación Individual**: Verifica un email
- **Análisis Masivo**: Valida múltiples emails en CSV
- Descarga resultados

## 🗄️ Estructura de la Base de Datos (Supabase)

### Tabla: `campaigns`
```sql
- id (UUID)
- user_id (UUID)
- name (Text)
- subject (Text)
- content (Text)
- status (Text: Borrador, Programada, Enviada)
- scheduled_date (Date)
- scheduled_time (Time)
- created_at (Timestamp)
```

### Tabla: `email_lists`
```sql
- id (UUID)
- user_id (UUID)
- name (Text)
- description (Text)
- email_count (Integer)
- created_at (Timestamp)
```

### Tabla: `smtp_servers`
```sql
- id (UUID)
- user_id (UUID)
- email (Text)
- host (Text)
- port (Integer)
- use_tls (Boolean)
- is_active (Boolean)
- created_at (Timestamp)
```

## 🔧 Requisitos

- **Python 3.8+**
- **Streamlit 1.28+**
- **Supabase Account** (gratuita en supabase.com)

## 📦 Dependencias Principales

```
streamlit>=1.28.0
supabase>=2.0.0
python-dotenv>=1.0.0
pandas>=2.0.0
email-validator>=2.0.0
```

## 🌐 Supabase Setup

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. En **SQL Editor**, ejecuta:

```sql
-- Tabla de campañas
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'Borrador',
  scheduled_date DATE,
  scheduled_time TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Tabla de listas
CREATE TABLE email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  email_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Tabla de servidores SMTP
CREATE TABLE smtp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER,
  use_tls BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

4. Copia tu **Project URL** y **Anon Key** al archivo `.env`

## 🚀 Despliegue en Streamlit Cloud

1. Sube tu proyecto a GitHub
2. Ve a [streamlit.io/cloud](https://streamlit.io/cloud)
3. Haz click en "New app"
4. Selecciona tu repositorio y `streamlit_app.py`
5. En **Settings → Secrets**, agrega:
```
VITE_SUPABASE_URL="tu-url"
VITE_SUPABASE_PUBLISHABLE_KEY="tu-clave"
```

## 📝 Cambios desde la Versión React

| Característica | React | Streamlit |
|---|---|---|
| Framework | React + TanStack | Python + Streamlit |
| BD | Supabase | Supabase (igual) |
| Autenticación | Supabase Auth | Supabase Auth |
| Interfaz | Componentes personalizados | Widgets Streamlit |
| Validación | Email-validator | email-validator |
| Envío | Nodemailer | smtplib (Python) |

## 🐛 Troubleshooting

### Error: "Variables de entorno de Supabase no configuradas"
✅ Verifica que el archivo `.env` existe y contiene las variables correctas

### Error: "Conexión SMTP exitosa" no funciona
✅ Verifica que:
- El host y puerto son correctos
- La contraseña es una contraseña de aplicación (no la contraseña de tu cuenta)
- El servidor acepta conexiones TLS/SSL

### Los datos no se guardan en Supabase
✅ Verifica que:
- Las tablas existen en tu proyecto de Supabase
- Las políticas RLS están configuradas correctamente
- El usuario está autenticado

## 📚 Documentación

- [Streamlit Docs](https://docs.streamlit.io)
- [Supabase Docs](https://supabase.com/docs)
- [Email Validator](https://github.com/JoshData/python-email-validator)

## 📄 Licencia

Este proyecto es de código abierto. Úsalo libremente.

## 👤 Autor

Creado con ❤️ por [@chillshuazz](https://github.com/chillshuazz)

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor:
1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-feature`)
3. Commit tus cambios (`git commit -m 'Add nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

---

**¿Preguntas?** Abre un [issue](https://github.com/chillshuazz/email-hub-pro/issues) en GitHub.
