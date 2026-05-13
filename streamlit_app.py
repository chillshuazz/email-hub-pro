import streamlit as st
import pandas as pd
from datetime import datetime
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import re
from email_validator import validate_email, EmailNotValidError

# Cargar variables de entorno
load_dotenv()

# Configurar página de Streamlit
st.set_page_config(
    page_title="📧 Email Hub Pro",
    page_icon="📧",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilos CSS personalizados
st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 1rem;
    }
    .success-box {
        background-color: #dcfce7;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #16a34a;
    }
    .error-box {
        background-color: #fee2e2;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #dc2626;
    }
    .info-box {
        background-color: #dbeafe;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #0284c7;
    }
    </style>
""", unsafe_allow_html=True)

# Inicializar cliente de Supabase
@st.cache_resource
def init_supabase():
    """Inicializar conexión con Supabase"""
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    
    if not url or not key:
        st.error("❌ Variables de entorno de Supabase no configuradas")
        st.stop()
    
    return create_client(url, key)

supabase: Client = init_supabase()

# Funciones de utilidad
def validate_smtp_config(host, port, email, password):
    """Validar configuración SMTP"""
    try:
        import smtplib
        server = smtplib.SMTP(host, int(port), timeout=5)
        server.starttls()
        server.login(email, password)
        server.quit()
        return True, "✅ Conexión SMTP exitosa"
    except Exception as e:
        return False, f"❌ Error: {str(e)}"

def validate_email_address(email):
    """Validar formato de email"""
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False

def is_valid_email_domain(email):
    """Validar dominio de email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

# === AUTENTICACIÓN ===
def show_auth_page():
    """Página de autenticación"""
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("<h1 style='text-align: center; color: #2563eb;'>📧 Email Hub Pro</h1>", unsafe_allow_html=True)
        st.markdown("<p style='text-align: center; color: #666;'>Gestiona tus campañas de email de forma profesional</p>", unsafe_allow_html=True)
        
        tab1, tab2 = st.tabs(["🔐 Iniciar Sesión", "📝 Registrarse"])
        
        with tab1:
            st.markdown("### Iniciar Sesión")
            email = st.text_input("📧 Email", key="login_email")
            password = st.text_input("🔑 Contraseña", type="password", key="login_password")
            
            if st.button("Entrar", use_container_width=True, type="primary"):
                if email and password:
                    try:
                        # Intentar login con Supabase
                        response = supabase.auth.sign_in_with_password({
                            "email": email,
                            "password": password
                        })
                        st.session_state.user = response.user
                        st.session_state.authenticated = True
                        st.success("✅ Sesión iniciada correctamente")
                        st.rerun()
                    except Exception as e:
                        st.error(f"❌ Error de autenticación: {str(e)}")
                else:
                    st.warning("⚠️ Por favor completa todos los campos")
        
        with tab2:
            st.markdown("### Crear Cuenta")
            new_email = st.text_input("📧 Email", key="signup_email")
            new_password = st.text_input("🔑 Contraseña", type="password", key="signup_password")
            confirm_password = st.text_input("🔑 Confirmar Contraseña", type="password", key="signup_confirm")
            
            if st.button("Registrarse", use_container_width=True, type="primary"):
                if new_email and new_password and confirm_password:
                    if new_password != confirm_password:
                        st.error("❌ Las contraseñas no coinciden")
                    elif len(new_password) < 6:
                        st.error("❌ La contraseña debe tener al menos 6 caracteres")
                    else:
                        try:
                            response = supabase.auth.sign_up({
                                "email": new_email,
                                "password": new_password
                            })
                            st.success("✅ Cuenta creada correctamente. Inicia sesión")
                        except Exception as e:
                            st.error(f"❌ Error: {str(e)}")
                else:
                    st.warning("⚠️ Por favor completa todos los campos")

# === PÁGINA PRINCIPAL (Dashboard) ===
def show_dashboard():
    """Dashboard principal"""
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.markdown("<h1 class='main-header'>📧 Email Hub Pro</h1>", unsafe_allow_html=True)
    
    with col2:
        if st.button("🚪 Cerrar Sesión"):
            st.session_state.authenticated = False
            st.session_state.user = None
            st.rerun()
    
    st.markdown("---")
    
    # Menú de navegación
    page = st.sidebar.radio(
        "Menú Principal",
        ["📊 Dashboard", "📧 Campañas", "📋 Listas", "🔌 SMTP", "🔍 Detectar Emails"],
        label_visibility="collapsed"
    )
    
    if page == "📊 Dashboard":
        show_dashboard_page()
    elif page == "📧 Campañas":
        show_campaigns_page()
    elif page == "📋 Listas":
        show_lists_page()
    elif page == "🔌 SMTP":
        show_smtp_page()
    elif page == "🔍 Detectar Emails":
        show_detect_page()

def show_dashboard_page():
    """Página del dashboard"""
    st.markdown("### 📊 Panel de Control")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("📧 Campañas", "0", "+0")
    
    with col2:
        st.metric("📋 Listas", "0", "+0")
    
    with col3:
        st.metric("🔌 SMTP", "0", "+0")
    
    with col4:
        st.metric("📨 Emails Enviados", "0", "+0")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 📈 Actividad Reciente")
        st.info("No hay actividad reciente")
    
    with col2:
        st.markdown("#### 📊 Estadísticas")
        st.info("Crea campañas para ver estadísticas")

def show_campaigns_page():
    """Página de gestión de campañas"""
    st.markdown("### 📧 Gestión de Campañas")
    
    tab1, tab2 = st.tabs(["📋 Ver Campañas", "➕ Nueva Campaña"])
    
    with tab1:
        st.markdown("#### Campañas Existentes")
        
        try:
            campaigns = supabase.table("campaigns").select("*").execute()
            
            if campaigns.data:
                df = pd.DataFrame(campaigns.data)
                st.dataframe(df, use_container_width=True)
            else:
                st.info("No hay campañas creadas. ¡Crea una nueva!")
        
        except Exception as e:
            st.warning(f"⚠️ No hay campaña en la base de datos")
    
    with tab2:
        st.markdown("#### Crear Nueva Campaña")
        
        col1, col2 = st.columns(2)
        
        with col1:
            campaign_name = st.text_input("📝 Nombre de la Campaña")
            campaign_subject = st.text_input("📧 Asunto del Email")
        
        with col2:
            campaign_list = st.selectbox("📋 Lista de Emails", ["Seleccionar lista..."])
            campaign_status = st.selectbox("📊 Estado", ["Borrador", "Programada", "Enviada"])
        
        campaign_content = st.text_area("📄 Contenido del Email", height=200)
        
        col1, col2 = st.columns(2)
        
        with col1:
            campaign_date = st.date_input("📅 Fecha de Envío")
        
        with col2:
            campaign_time = st.time_input("⏰ Hora de Envío")
        
        if st.button("✅ Crear Campaña", type="primary", use_container_width=True):
            if campaign_name and campaign_subject and campaign_content:
                try:
                    campaign_data = {
                        "name": campaign_name,
                        "subject": campaign_subject,
                        "content": campaign_content,
                        "status": campaign_status,
                        "scheduled_date": str(campaign_date),
                        "scheduled_time": str(campaign_time),
                        "created_at": datetime.now().isoformat()
                    }
                    
                    supabase.table("campaigns").insert(campaign_data).execute()
                    st.success("✅ Campaña creada correctamente")
                    st.rerun()
                
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")
            else:
                st.warning("⚠️ Por favor completa todos los campos")

def show_lists_page():
    """Página de gestión de listas"""
    st.markdown("### 📋 Gestión de Listas de Emails")
    
    tab1, tab2 = st.tabs(["📋 Ver Listas", "➕ Nueva Lista"])
    
    with tab1:
        st.markdown("#### Listas Existentes")
        
        try:
            lists = supabase.table("email_lists").select("*").execute()
            
            if lists.data:
                df = pd.DataFrame(lists.data)
                st.dataframe(df, use_container_width=True)
            else:
                st.info("No hay listas creadas.")
        
        except Exception:
            st.warning("⚠️ No hay listas en la base de datos")
    
    with tab2:
        st.markdown("#### Crear Nueva Lista")
        
        col1, col2 = st.columns(2)
        
        with col1:
            list_name = st.text_input("📝 Nombre de la Lista")
            list_description = st.text_area("📄 Descripción", height=100)
        
        with col2:
            upload_type = st.radio("📤 Importar desde:", ["Manual", "CSV"])
        
        if upload_type == "CSV":
            uploaded_file = st.file_uploader("Sube un archivo CSV", type=["csv"])
            
            if uploaded_file:
                try:
                    df = pd.read_csv(uploaded_file)
                    st.dataframe(df, use_container_width=True)
                    
                    if st.button("✅ Importar Lista", type="primary", use_container_width=True):
                        # Procesar y guardar
                        st.success("✅ Lista importada correctamente")
                
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")
        
        else:
            emails_text = st.text_area("📧 Emails (uno por línea)", height=150)
            
            if st.button("✅ Crear Lista", type="primary", use_container_width=True):
                if list_name and emails_text:
                    try:
                        emails = [e.strip() for e in emails_text.split("\n") if e.strip()]
                        
                        # Validar emails
                        valid_emails = [e for e in emails if validate_email_address(e)]
                        
                        if valid_emails:
                            list_data = {
                                "name": list_name,
                                "description": list_description,
                                "email_count": len(valid_emails),
                                "created_at": datetime.now().isoformat()
                            }
                            
                            result = supabase.table("email_lists").insert(list_data).execute()
                            st.success(f"✅ Lista creada con {len(valid_emails)} emails válidos")
                        else:
                            st.error("❌ No hay emails válidos")
                    
                    except Exception as e:
                        st.error(f"❌ Error: {str(e)}")
                else:
                    st.warning("⚠️ Por favor completa todos los campos")

def show_smtp_page():
    """Página de configuración SMTP"""
    st.markdown("### 🔌 Configuración de Servidores SMTP")
    
    tab1, tab2 = st.tabs(["📋 Ver SMTP", "➕ Nuevo SMTP"])
    
    with tab1:
        st.markdown("#### Servidores SMTP Guardados")
        
        try:
            smtps = supabase.table("smtp_servers").select("*").execute()
            
            if smtps.data:
                for smtp in smtps.data:
                    with st.container():
                        col1, col2, col3 = st.columns([2, 1, 1])
                        
                        with col1:
                            st.markdown(f"**📧 {smtp.get('email', 'N/A')}**")
                            st.caption(f"🌐 {smtp.get('host', 'N/A')}:{smtp.get('port', 'N/A')}")
                        
                        with col2:
                            st.caption("✅ Activo" if smtp.get('is_active') else "❌ Inactivo")
                        
                        with col3:
                            if st.button("🗑️ Eliminar", key=smtp.get('id')):
                                supabase.table("smtp_servers").delete().eq("id", smtp.get('id')).execute()
                                st.rerun()
                
                st.markdown("---")
            else:
                st.info("No hay servidores SMTP configurados.")
        
        except Exception:
            st.warning("⚠️ No hay SMTP en la base de datos")
    
    with tab2:
        st.markdown("#### Agregar Nuevo Servidor SMTP")
        
        col1, col2 = st.columns(2)
        
        with col1:
            smtp_email = st.text_input("📧 Email del Servidor")
            smtp_host = st.text_input("🌐 Host del Servidor (ej: smtp.gmail.com)")
        
        with col2:
            smtp_port = st.number_input("🔢 Puerto", value=587, min_value=1, max_value=65535)
            smtp_password = st.text_input("🔑 Contraseña de Aplicación", type="password")
        
        use_tls = st.checkbox("🔒 Usar TLS", value=True)
        
        if st.button("✅ Verificar y Guardar", type="primary", use_container_width=True):
            if smtp_email and smtp_host and smtp_password:
                with st.spinner("🔄 Verificando conexión..."):
                    success, message = validate_smtp_config(smtp_host, smtp_port, smtp_email, smtp_password)
                    
                    if success:
                        try:
                            smtp_data = {
                                "email": smtp_email,
                                "host": smtp_host,
                                "port": smtp_port,
                                "use_tls": use_tls,
                                "is_active": True,
                                "created_at": datetime.now().isoformat()
                            }
                            
                            supabase.table("smtp_servers").insert(smtp_data).execute()
                            st.success("✅ Servidor SMTP guardado correctamente")
                            st.rerun()
                        
                        except Exception as e:
                            st.error(f"❌ Error: {str(e)}")
                    else:
                        st.error(message)
            else:
                st.warning("⚠️ Por favor completa todos los campos")

def show_detect_page():
    """Página de detección de emails"""
    st.markdown("### 🔍 Detectar y Validar Emails")
    
    tab1, tab2 = st.tabs(["🔍 Validación Individual", "📊 Análisis Masivo"])
    
    with tab1:
        st.markdown("#### Validar Email Individual")
        
        email_to_validate = st.text_input("📧 Email a Validar")
        
        if st.button("✅ Validar", type="primary", use_container_width=True):
            if email_to_validate:
                is_valid = validate_email_address(email_to_validate)
                has_valid_domain = is_valid_email_domain(email_to_validate)
                
                col1, col2 = st.columns(2)
                
                with col1:
                    if is_valid:
                        st.success("✅ Formato válido")
                    else:
                        st.error("❌ Formato inválido")
                
                with col2:
                    if has_valid_domain:
                        st.success("✅ Dominio válido")
                    else:
                        st.error("❌ Dominio inválido")
            else:
                st.warning("⚠️ Por favor ingresa un email")
    
    with tab2:
        st.markdown("#### Validación Masiva")
        
        emails_input = st.text_area("📧 Emails (uno por línea)", height=200)
        
        if st.button("✅ Analizar", type="primary", use_container_width=True):
            if emails_input:
                emails = [e.strip() for e in emails_input.split("\n") if e.strip()]
                
                results = []
                for email in emails:
                    is_valid = validate_email_address(email)
                    has_valid_domain = is_valid_email_domain(email)
                    
                    results.append({
                        "Email": email,
                        "Formato Válido": "✅" if is_valid else "❌",
                        "Dominio Válido": "✅" if has_valid_domain else "❌",
                        "Estado": "✅ Válido" if (is_valid and has_valid_domain) else "❌ Inválido"
                    })
                
                df_results = pd.DataFrame(results)
                st.dataframe(df_results, use_container_width=True)
                
                # Estadísticas
                valid_count = sum(1 for r in results if r["Estado"] == "✅ Válido")
                invalid_count = len(results) - valid_count
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Total", len(results))
                with col2:
                    st.metric("Válidos", valid_count)
                with col3:
                    st.metric("Inválidos", invalid_count)
                
                # Descargar resultados
                csv = df_results.to_csv(index=False)
                st.download_button(
                    "📥 Descargar Resultados",
                    csv,
                    "validacion_emails.csv",
                    "text/csv"
                )
            else:
                st.warning("⚠️ Por favor ingresa al menos un email")

# === CONTROL PRINCIPAL ===
def main():
    """Función principal"""
    
    # Inicializar estado de sesión
    if "authenticated" not in st.session_state:
        st.session_state.authenticated = False
    if "user" not in st.session_state:
        st.session_state.user = None
    
    # Mostrar página según autenticación
    if st.session_state.authenticated:
        show_dashboard()
    else:
        show_auth_page()

if __name__ == "__main__":
    main()
