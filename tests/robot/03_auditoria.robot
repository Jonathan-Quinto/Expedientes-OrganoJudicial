*** Settings ***
Documentation     PB-03 / HU-03 — Auditoría y trazabilidad: quién, qué, cuándo, antes y después.
Resource          resources/common.resource
Suite Setup       Abrir Sesion API
Test Tags         PB-03    seguridad

*** Test Cases ***
Cambio de estado queda en la bitacora con antes y despues
    ${hs}=    Login Como    secretario1
    ${exp}=    Crear Expediente De Prueba    ${hs}
    ${hj}=    Login Como    juez1
    ${body}=    Create Dictionary    estado=en_audiencia    motivo=Se fija audiencia
    POST On Session    api    /api/expedientes/${exp}[id]/estado    json=${body}    headers=${hj}
    ${ha}=    Login Como    admin1
    ${params}=    Create Dictionary    entidad=expediente    entidad_id=${exp}[id]
    ${resp}=    GET On Session    api    /api/auditoria    params=${params}    headers=${ha}
    ${ultimo}=    Set Variable    ${resp.json()}[0]
    Should Be Equal    ${ultimo}[accion]    CAMBIAR_ESTADO
    Should Be Equal    ${ultimo}[usuario]    juez1
    Should Contain    ${ultimo}[antes]    radicado
    Should Contain    ${ultimo}[despues]    en_audiencia

Login fallido tambien queda registrado
    ${body}=    Create Dictionary    username=intruso    password=x
    POST On Session    api    /api/auth/login    json=${body}    expected_status=401
    ${ha}=    Login Como    admin1
    ${resp}=    GET On Session    api    /api/auditoria    headers=${ha}
    ${acciones}=    Evaluate    [r["accion"] for r in $resp.json()]
    List Should Contain Value    ${acciones}    LOGIN_FALLIDO

La cadena de hashes de la bitacora esta integra
    ${ha}=    Login Como    admin1
    ${resp}=    GET On Session    api    /api/auditoria/verificar    headers=${ha}
    Should Be True    ${resp.json()}[integra]
