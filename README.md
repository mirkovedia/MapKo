# MapKo

**Escaner masivo de negocios en Google Maps con analisis de presencia digital y scoring de oportunidad.**

MapKo escanea zonas geograficas completas, analiza la presencia digital de cada negocio encontrado (sitio web, redes sociales, reviews, WhatsApp, sistema de reservas) y genera un puntaje de oportunidad (0-100) para identificar negocios que necesitan servicios digitales.

Pensado para freelancers y agencias que venden sitios web, landing pages, automatizaciones y software local a negocios que aun no tienen presencia digital.

---

## Funcionalidades

### Escaneo Masivo
- Busqueda por zona geografica con radio configurable (0.5 - 50 km)
- Mapa interactivo con circulo de radio arrastrable
- 22 categorias de negocio (barberias, restaurantes, tiendas de ropa, perfumerias, etc.)
- Busqueda paralela por categoria con paginacion automatica (hasta 60 resultados por tipo)
- Filtro automatico de negocios cerrados permanente o temporalmente

### Analisis de Presencia Digital
- Deteccion de sitio web + SSL + responsive + velocidad de carga
- Deteccion de redes sociales (Facebook, Instagram, Twitter, TikTok)
- Tasa de respuesta a reviews de Google
- Deteccion de sistema de reservas online
- Deteccion de WhatsApp Business
- Tecnologia del sitio web (WordPress, Wix, Shopify, etc.)

### Scoring de Oportunidad
- Puntaje 0-100 basado en multiples factores ponderados
- Recomendaciones automaticas por negocio (necesita web, redes, booking, etc.)
- Completitud de perfil de Google Business

### Dashboard Interactivo
- Vista de mapa con pines por color segun score (rojo/naranja/verde)
- Vista de lista con filtros avanzados
- Mapa de calor (heat map) de oportunidades
- Filtros por necesidad de servicio (Pagina Web, Redes Sociales, WhatsApp, Booking)
- Filtro "Solo WhatsApp" para contacto directo (detecta celular vs fijo)
- Busqueda por nombre o direccion
- Ordenamiento por score, rating, reviews, nombre

### Mini CRM
- Estados de lead por negocio (nuevo, contactado, interesado, cliente, descartado)
- Notas por negocio
- Fecha de ultimo contacto
- Seleccion masiva con acciones en bulk

### Exportacion y Reportes
- Exportacion a Excel (XLSX) con todos los datos del escaneo
- Reportes PDF individuales por negocio con score visual y recomendaciones
- Links directos a WhatsApp y Google Maps por negocio

### Compartir Escaneos
- Generacion de link publico con token unico
- Vista publica de solo lectura para compartir resultados con clientes

### Monetizacion
- Sistema de planes (Free / Pro) con limites configurables
- Integracion con Stripe Checkout + Webhooks
- Control de escaneos mensuales por plan

---

## Tech Stack

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Frontend | React 19, TypeScript, Tailwind CSS |
| Componentes | shadcn/ui, Lucide Icons, Framer Motion |
| Mapas | Google Maps JavaScript API, @vis.gl/react-google-maps |
| Datos de negocios | Google Places API (Legacy) |
| Geocoding | Google Geocoding API |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Pagos | Stripe (Checkout + Webhooks) |
| Graficos | Recharts |
| PDF | jsPDF |
| Excel | ExcelJS |
| Web Scraping | Cheerio (analisis de sitios web) |
| Validacion | Zod |

---

## Arquitectura

```
src/
├── app/
│   ├── (auth)/            # Login, Signup
│   ├── (dashboard)/       # Dashboard protegido
│   │   └── dashboard/
│   │       ├── scans/     # Lista de escaneos, nuevo escaneo, detalle
│   │       ├── exports/   # Historial de exportaciones
│   │       ├── billing/   # Gestion de plan y pagos
│   │       └── settings/  # Configuracion de cuenta
│   ├── (marketing)/       # Landing page, Pricing
│   ├── (public)/          # Vista publica de escaneos compartidos
│   └── api/
│       ├── scans/         # CRUD + procesamiento asincrono
│       ├── businesses/    # Detalle, reportes PDF, actualizacion CRM
│       ├── auth/          # Callback de Supabase Auth
│       └── stripe/        # Checkout + Webhooks
├── components/
│   ├── ui/                # Componentes base (Button, Input, Card, etc.)
│   ├── map/               # ScanMap con pines y heat map
│   └── scan/              # ScanPreviewMap con radio interactivo
├── lib/
│   ├── google/            # Places client, Category mapper
│   ├── supabase/          # Server client, Admin client
│   ├── analyzer/          # Website checker, Score calculator
│   ├── email/             # Notificaciones por email
│   └── hooks/             # useCachedFetch (SWR-like cache)
└── types/                 # Tipos compartidos, categorias, planes
```

### Flujo de un Escaneo

```
1. Usuario selecciona zona + categorias + radio
2. POST /api/scans/create → valida plan, geocodifica, crea registro
3. Fire-and-forget → POST /api/scans/process
4. Fase 1 (Scanning): busqueda paralela por categoria en Google Places
5. Fase 2 (Analyzing): batch de 8 negocios en paralelo
   - Place Details → telefono, website, reviews
   - Website analysis → SSL, responsive, tech, social links
   - Score calculation → puntaje 0-100 + recomendaciones
6. Status: completed → notificacion por email
7. Dashboard muestra resultados con mapa + filtros + CRM
```

---

## Setup Local

### Prerequisitos

- Node.js 18+
- Cuenta de [Supabase](https://supabase.com)
- Google Cloud con APIs habilitadas:
  - Places API
  - Geocoding API
  - Maps JavaScript API
- Cuenta de [Stripe](https://stripe.com) (opcional, para pagos)

### Instalacion

```bash
git clone https://github.com/baronvedia-blipas/MapKo.git
cd MapKo
npm install
```

### Variables de Entorno

Crear `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google
GOOGLE_PLACES_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# Stripe (opcional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Ejecutar

```bash
npm run dev
```

---

## Screenshots

> Proximamente: capturas del dashboard, mapa de calor, resultados de escaneo y reporte PDF.

---

## Roadmap

- [ ] Integracion con CRM externos (HubSpot, Pipedrive)
- [ ] Notificaciones push cuando un escaneo termina
- [ ] Alertas automaticas de nuevos negocios en zonas monitoreadas
- [ ] API publica para integraciones
- [ ] Soporte multi-idioma (EN/ES/PT)
- [ ] App movil (React Native)

---

## Licencia

Proyecto privado. Todos los derechos reservados.

---

Creado por [@baronvedia](https://github.com/baronvedia-blipas)
