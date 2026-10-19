*** Settings ***
Documentation     Datos propios por suite: usuarios y expedientes unicos por ejecucion
...               (no dependen de juez2 ni del orden de las suites).
Resource          common.resource

*** Keywords ***
Sufijo Unico
    ${s}=    Evaluate    __import__('uuid').uuid4().hex[:8]
    RETURN    ${s}

Crear Usuario Prueba
    [Documentation]    El admin crea un usuario nuevo del rol dado. Devuelve el dict (id, username, ...).
    [Arguments]    ${rol}    ${admin_headers}
    ${s}=    Sufijo Unico
    ${body}=    Create Dictionary    username=qa_${rol}_${s}    nombre=QA ${rol} ${s}    password=${PASSWORD}    rol=${rol}
    ${resp}=    POST On Session    api    /api/usuarios    json=${body}    headers=${admin_headers}    expected_status=201
    RETURN    ${resp.json()}

Crear Expediente Propio
    [Documentation]    Lo crea el secretario. Parametros opcionales se omiten si son None.
    [Arguments]    ${sec_headers}    ${juez_id}=${None}    ${abogado_id}=${None}    ${materia}=civil    ${fecha_limite}=${None}
    ${body}=    Create Dictionary    materia=${materia}    demandante=QA Demandante    demandado=QA Demandado
    ...    descripcion=Datos propios de QA
    IF    $juez_id is not None    Set To Dictionary    ${body}    juez_id=${juez_id}
    IF    $abogado_id is not None    Set To Dictionary    ${body}    abogado_id=${abogado_id}
    IF    $fecha_limite is not None    Set To Dictionary    ${body}    fecha_limite=${fecha_limite}
    ${resp}=    POST On Session    api    /api/expedientes    json=${body}    headers=${sec_headers}    expected_status=201
    RETURN    ${resp.json()}

Cambiar Estado
    [Arguments]    ${juez_headers}    ${exp_id}    ${estado}
    ${body}=    Create Dictionary    estado=${estado}    motivo=Cambio de QA automatizado
    ${resp}=    POST On Session    api    /api/expedientes/${exp_id}/estado    json=${body}    headers=${juez_headers}    expected_status=200
    RETURN    ${resp.json()}

Ids De Lista
    [Arguments]    ${lista}
    ${ids}=    Evaluate    [e["id"] for e in $lista]
    RETURN    ${ids}

Fecha Relativa
    [Documentation]    Fecha ISO de hoy + N dias.
    [Arguments]    ${dias}
    ${f}=    Evaluate    (__import__('datetime').date.today() + __import__('datetime').timedelta(days=${dias})).isoformat()
    RETURN    ${f}

Listar Expedientes
    [Arguments]    ${headers}    &{params}
    ${resp}=    GET On Session    api    /api/expedientes    params=${params}    headers=${headers}    expected_status=200
    RETURN    ${resp.json()}
