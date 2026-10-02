*** Settings ***
Documentation     PB-01 / HU-01 — Gestión de expedientes digitales.
Resource          resources/common.resource
Suite Setup       Abrir Sesion API
Test Tags         PB-01    calidad

*** Test Cases ***
Secretario registra un expediente con numero y codigo de consulta
    ${h}=    Login Como    secretario1
    ${exp}=    Crear Expediente De Prueba    ${h}
    Should Match Regexp    ${exp}[numero]    ^EXP-\\d{4}-\\d{6}$
    Should Be Equal    ${exp}[estado]    radicado
    Length Should Be    ${exp}[codigo_consulta]    8

Expediente nuevo arranca con actuacion de radicacion
    ${h}=    Login Como    secretario1
    ${exp}=    Crear Expediente De Prueba    ${h}
    ${resp}=    GET On Session    api    /api/expedientes/${exp}[id]    headers=${h}
    Should Be Equal    ${resp.json()}[actuaciones][0][tipo]    radicacion

Datos invalidos son rechazados con 422
    ${h}=    Login Como    secretario1
    ${body}=    Create Dictionary    materia=c    demandante=${EMPTY}    demandado=x
    POST On Session    api    /api/expedientes    json=${body}    headers=${h}    expected_status=422

Juez cambia el estado de un expediente asignado
    ${hs}=    Login Como    secretario1
    ${exp}=    Crear Expediente De Prueba    ${hs}
    ${hj}=    Login Como    juez1
    ${body}=    Create Dictionary    estado=en_tramite    motivo=Admitida la demanda
    ${resp}=    POST On Session    api    /api/expedientes/${exp}[id]/estado    json=${body}    headers=${hj}    expected_status=200
    Should Be Equal    ${resp.json()}[estado]    en_tramite

Juez no ve expedientes de otro juez
    ${hs}=    Login Como    secretario1
    ${exp}=    Crear Expediente De Prueba    ${hs}
    ${hj2}=    Login Como    juez2
    GET On Session    api    /api/expedientes/${exp}[id]    headers=${hj2}    expected_status=403

Busqueda por parte encuentra el expediente
    ${h}=    Login Como    secretario1
    Crear Expediente De Prueba    ${h}
    ${params}=    Create Dictionary    q=Robot Demandante
    ${resp}=    GET On Session    api    /api/expedientes    params=${params}    headers=${h}
    Should Not Be Empty    ${resp.json()}

Alertas de plazo incluyen expedientes por vencer
    [Tags]    PB-06
    ${h}=    Login Como    secretario1
    ${resp}=    GET On Session    api    /api/expedientes/alertas    headers=${h}
    Should Not Be Empty    ${resp.json()}
