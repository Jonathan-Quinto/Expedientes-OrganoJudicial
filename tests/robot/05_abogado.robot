*** Settings ***
Documentation     HU-07 — El abogado consulta solo sus expedientes y presenta escritos.
Resource          resources/datos.resource
Suite Setup       Preparar Datos
Test Tags         HU-07    PB-01    abogado

*** Test Cases ***
Abogado lista solo los expedientes que patrocina
    ${lista}=    Listar Expedientes    ${H_ABG}
    ${ids}=    Ids De Lista    ${lista}
    Should Be Equal As Integers    ${{len($ids)}}    2
    List Should Contain Value    ${ids}    ${EXP1}[id]
    List Should Contain Value    ${ids}    ${EXP2}[id]
    List Should Not Contain Value    ${ids}    ${EXP_AJENO}[id]
    FOR    ${e}    IN    @{lista}
        Should Be Equal As Integers    ${e}[abogado_id]    ${ABG}[id]
    END

Abogado demo (abogado1) solo ve expedientes donde es abogado de parte
    ${h}=    Login Como    abogado1
    ${yo}=    GET On Session    api    /api/auth/me    headers=${h}    expected_status=200
    ${lista}=    Listar Expedientes    ${h}
    FOR    ${e}    IN    @{lista}
        Should Be Equal As Integers    ${e}[abogado_id]    ${yo.json()}[id]
    END

Abogado recibe 403 al consultar un expediente ajeno
    GET On Session    api    /api/expedientes/${EXP_AJENO}[id]    headers=${H_ABG}    expected_status=403

Abogado recibe 403 al presentar escrito en expediente ajeno
    ${body}=    Create Dictionary    tipo=escrito    detalle=Intento sobre expediente ajeno
    POST On Session    api    /api/expedientes/${EXP_AJENO}[id]/actuaciones    json=${body}    headers=${H_ABG}    expected_status=403

Abogado presenta un escrito y queda en el expediente y la bitacora
    ${body}=    Create Dictionary    tipo=escrito    detalle=Contestacion de la demanda
    ${resp}=    POST On Session    api    /api/expedientes/${EXP1}[id]/actuaciones    json=${body}    headers=${H_ABG}    expected_status=201
    Should Be Equal    ${resp.json()}[tipo]    escrito
    ${det}=    GET On Session    api    /api/expedientes/${EXP1}[id]    headers=${H_ABG}    expected_status=200
    ${tipos}=    Evaluate    [a["tipo"] for a in $det.json()["actuaciones"]]
    List Should Contain Value    ${tipos}    escrito
    ${params}=    Create Dictionary    entidad=actuacion    entidad_id=${resp.json()}[id]
    ${aud}=    GET On Session    api    /api/auditoria    params=${params}    headers=${H_ADMIN}    expected_status=200
    Should Be Equal    ${aud.json()}[0][accion]    AGREGAR_ACTUACION
    Should Be Equal    ${aud.json()}[0][usuario]    ${ABG}[username]

Abogado recibe 403 al cambiar el estado
    ${body}=    Create Dictionary    estado=en_tramite    motivo=Intento no permitido
    POST On Session    api    /api/expedientes/${EXP1}[id]/estado    json=${body}    headers=${H_ABG}    expected_status=403
    ${det}=    GET On Session    api    /api/expedientes/${EXP1}[id]    headers=${H_ADMIN}
    Should Be Equal    ${det.json()}[estado]    radicado

Abogado recibe 403 al crear un expediente
    ${body}=    Create Dictionary    materia=civil    demandante=Intruso Uno    demandado=Intruso Dos
    POST On Session    api    /api/expedientes    json=${body}    headers=${H_ABG}    expected_status=403

Abogado recibe 403 al consultar la auditoria
    GET On Session    api    /api/auditoria    headers=${H_ABG}    expected_status=403
    GET On Session    api    /api/expedientes/${EXP1}[id]/auditoria    headers=${H_ABG}    expected_status=403

*** Keywords ***
Preparar Datos
    Abrir Sesion API
    ${admin}=    Login Como    admin1
    ${sec}=    Login Como    secretario1
    ${juez}=    Crear Usuario Prueba    juez    ${admin}
    ${abg}=    Crear Usuario Prueba    abogado    ${admin}
    ${otro}=    Crear Usuario Prueba    abogado    ${admin}
    ${e1}=    Crear Expediente Propio    ${sec}    ${juez}[id]    ${abg}[id]
    ${e2}=    Crear Expediente Propio    ${sec}    ${juez}[id]    ${abg}[id]
    ${e3}=    Crear Expediente Propio    ${sec}    ${juez}[id]    ${otro}[id]
    ${h}=    Login Como    ${abg}[username]
    Set Suite Variable    ${H_ADMIN}    ${admin}
    Set Suite Variable    ${H_ABG}    ${h}
    Set Suite Variable    ${ABG}    ${abg}
    Set Suite Variable    ${EXP1}    ${e1}
    Set Suite Variable    ${EXP2}    ${e2}
    Set Suite Variable    ${EXP_AJENO}    ${e3}
