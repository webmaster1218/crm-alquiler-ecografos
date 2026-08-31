---
name: linear_mcp
description: Instrucciones y flujo de trabajo para usar el MCP de Linear y gestionar tareas de proyectos.
---

# Gestión de Tareas en Linear con MCP

Esta skill describe cómo interactuar con el servidor MCP de Linear configurado en el entorno de desarrollo y define el estándar para la creación, actualización y organización de tareas de los proyectos de Fábrica de Winners (ej. Telocalizo Tags).

## 1. Configuración del Servidor MCP
El MCP de Linear se configura a través del archivo global de configuración de MCP:
- **Ubicación:** `c:\Users\Usuario\.gemini\config\mcp_config.json`
- **Paquete utilizado:** `mcp-linear` de npm (ejecutado con `npx`).
- **Variable obligatoria:** `LINEAR_API_KEY` (Personal API Key de Linear).

Ejemplo de configuración:
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-linear"
      ],
      "env": {
        "LINEAR_API_KEY": "tu_api_key_aqui"
      }
    }
  }
}
```

## 2. Acceso a Claves de API de Linear
Para obtener o regenerar la API Key de Linear:
1. Ir a **Settings** en Linear Desktop o Web.
2. Navegar a **Account** ➔ **API** (o **Security & Access**).
3. Crear una nueva clave en **Personal API keys** y guardarla inmediatamente.

## 3. Estándar de Formato de Tareas
Al crear o actualizar tareas pendientes, se deben seguir estas reglas estrictas:

### Títulos
* **Sin prefijos redundantes:** No incluyas el código de issue (como `PRO-281: `) en el título del ticket, ya que Linear genera y muestra ese identificador de forma nativa.
* **Claros y directos:** El título debe describir de forma muy concisa la tarea (ej. *Escalación a humano en Agente IA WhatsApp*).

### Descripciones
* **Sin bloques de metadatos:** No añadas información de prioridad, tipo de issue, asignado, o proyecto dentro del texto de descripción. Esos campos deben gestionarse a través de las propiedades nativas de Linear.
* **Solo acción descriptiva:** El campo de descripción debe contener únicamente el párrafo que explica detalladamente la acción técnica a realizar (ej. *Implementar la derivación o escalación automática a un humano cuando el agente identifique...*).

## 4. Datos Estructurales de Linear (UUIDs)

Para facilitar la automatización, utiliza las siguientes credenciales y referencias directas:

### Equipo Principal (Team)
*   **Programacion-webmaster-FBW (PRO):** `9bd12994-777f-4d8a-9480-ece1c945545e`

### Proyectos Disponibles (projectId)
*   `d714c529-e66a-418a-8bd8-3c0f1e0c1e60` — **ECOMMERCE TAGS TELOCALIZO**
*   `24f4746a-5155-494a-b8dd-f7574e459ae9` — **FABRICA DE WINNERS**
*   `0bcc1521-bbfe-45fa-b09c-27e9b7f6c5f8` — **ALQUILER DE ECOGRAFOS**
*   `3167640a-09e8-4758-8814-3aa22e4535be` — **FINCA JUANA CERRO TUSA**

### Estados de Tarea (stateId)
*   `ff139627-2e38-4e93-a411-1ed311cc644c` — **Backlog**
*   `c14d3174-4e9e-4e1a-b2aa-10b60401dfee` — **Todo**
*   `ca1f3587-8a76-4172-a38e-03fccecabaec` — **In Progress**
*   `18dd18af-616c-4146-bddb-11e6e8776af6` — **Done**

### Etiquetas (labelIds)
*   **Mantenimiento Agentes IA:** `fc50a4a4-f039-473b-a58e-a644de10351d`
*   **Integración:** `bc8b21c5-1809-483f-b371-5f89680d5e77`
*   **Contenido / SEO:** `514cb050-fd8b-4ff9-8766-0df172064b23`
*   **Configuración / Infra:** `c2c55168-b746-4c56-afbb-b28e998b803d`
*   **Bug:** `e80a4655-a610-473a-b8ed-781206cc0fd2`
*   **Mejora:** `b3bb5cab-9fed-46dd-8988-8530c73ff1ce`
*   **Feature:** `78267551-5a8e-4b29-b93f-79f64af20940`
