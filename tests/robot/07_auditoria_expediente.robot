*** Settings ***
Documentation     HU-09 — Historial de auditoria por expediente. Ademas cubre brechas del analista:
...               PATCH con juez_id invalido, alertas sin archivados e integridad de la bitacora.
Resource          resources/datos.resource
Suite Setup       Preparar Datos
Test Tags         HU-09    PB-03    auditoria

*** Test Cases ***
Historial en orden cronologico con CREAR y CONSULTAR con expediente_id
    ${resp}=    GET On Session    api    /api/expedientes/${EXP}[id]/auditoria    headers=${H_SEC}    expected_status=200
    ${reg}=    Set Variable    ${resp.json()}
    ${acciones}=    Evaluate    [r["accion"] for r in $reg]
    List Should Contain Value    ${acciones}    CREAR_EXPEDIENTE
    List Should Contain Value    ${acciones}    CONSULTAR_EXPEDIENTE
    List Should Contain Value    ${acciones}    CAMBIAR_ESTADO
    Should Be Equal    ${acciones}[0]    CREAR_EXPEDIENTE
    ${ids}=    Evaluate    [r["id"] for r in $reg]
    ${orden}=    Evaluate    $ids == sorted($ids)
    Should Be True    ${orden}
    FOR    ${r}    IN    @{reg}
        Should Be Equal As Integers    ${r}[expediente_id]    ${EXP}[id]
    END

Historial incluye usuario fecha hash antes y despues
    ${resp}=    GET On Session    api    /api/expedientes/${EXP}[id]/auditoria    headers=${H_ADMIN}    expected_status=200
    ${cambio}=    Evaluate    [r for r in $resp.json() if r["accion"] == "CAMBIAR_ESTADO"][0]
    Should Be Equal    ${cambio}[usuario]    ${JUEZ}[username]
    Should Contain    ${cambio}[antes]    radicado
    Should Contain    ${cambio}[despues]    en_tramite
    Should Not Be Empty    ${cambio}[fecha]
    Should Not Be Empty    ${cambio}[hash]

Juez dueno y admin ven el historial
    GET On Session    api    /api/expedientes/${EXP}[id]/auditoria    headers=${H_JUEZ}    expected_status=200
    GET On Session    api    /api/expedientes/${EXP}[id]/auditoria    headers=${H_ADMIN}    expected_status=200

Secretario ve el historial con 200
    GET On Session    api    /api/expedientes/${EXP}[id]/auditoria    headers=${H_SEC}    expected_status=200

Juez ajeno recibe 403 en el historial
    GET On Session    api    /api/expedientes/${EXP}[id]/auditoria    headers=${H_JUEZ_AJENO}    expected_status=403

Historial de expediente inexistente da 404
    GET On Session    api    /api/expedientes/99999999/auditoria    headers=${H_SEC}    expected_status=404

PATCH con juez_id que no es juez devuelve 422 y no cambia nada
    ${body}=    Create Dictionary    juez_id=${SEC_ID}
    PATCH On Session    api    /api/expedientes/${EXP}[id]    json=${body}    headers=${H_SEC}    expected_status=422
    ${body2}=    Create Dictionary    juez_id=${ABG}[id]
    PATCH On Session    api    /api/expedientes/${EXP}[id]    json=${body2}    headers=${H_SEC}    expected_status=422
    ${det}=    GET On Session    api    /api/expedientes/${EXP}[id]    headers=${H_ADMIN}
    Should Be Equal As Integers    ${det.json()}[juez_id]    ${JUEZ}[id]

PATCH con abogado_id que no es abogado devuelve 422
    ${body}=    Create Dictionary    abogado_id=${JUEZ}[id]
    PATCH On Session    api    /api/expedientes/${EXP}[id]    json=${body}    headers=${H_SEC}    expected_status=422

PATCH valido se aplica y queda auditado
    ${body}=    Create Dictionary    descripcion=Descripcion editada por QA
    ${resp}=    PATCH On Session    api    /api/expedientes/${EXP}[id]    json=${body}    headers=${H_SEC}    expected_status=200
    Should Be Equal    ${resp.json()}[descripcion]    Descripcion editada por QA
    ${aud}=    GET On Session    api    /api/expedientes/${EXP}[id]/auditoria    headers=${H_ADMIN}
    ${acciones}=    Evaluate    [r["accion"] for r in $aud.json()]
    List Should Contain Value    ${acciones}    EDITAR_EXPEDIENTE

Alertas incluyen vencidos y excluyen archivados y con sentencia
    ${ayer}=    Fecha Relativa    -1
    ${activo}=    Crear Expediente Propio    ${H_SEC}    ${JUEZ}[id]    fecha_limite=${ayer}
    ${arch}=    Crear Expediente Propio    ${H_SEC}    ${JUEZ}[id]    fecha_limite=${ayer}
    ${sent}=    Crear Expediente Propio    ${H_SEC}    ${JUEZ}[id]    fecha_limite=${ayer}
    ${antes}=    GET On Session    api    /api/expedientes/alertas    headers=${H_SEC}    expected_status=200
    ${ids_antes}=    Ids De Lista    ${antes.json()}
    List Should Contain Value    ${ids_antes}    ${arch}[id]
    Cambiar Estado    ${H_JUEZ}    ${arch}[id]    archivado
    Cambiar Estado    ${H_JUEZ}    ${sent}[id]    con_sentencia
    ${despues}=    GET On Session    api    /api/expedientes/alertas    headers=${H_SEC}    expected_status=200
    ${ids}=    Ids De Lista    ${despues.json()}
    List Should Contain Value    ${ids}    ${activo}[id]
    List Should Not Contain Value    ${ids}    ${arch}[id]
    List Should Not Contain Value    ${ids}    ${sent}[id]
    ${mias}=    GET On Session    api    /api/expedientes/alertas    headers=${H_JUEZ}    expected_status=200
    ${ids_juez}=    Ids De Lista    ${mias.json()}
    List Should Contain Value    ${ids_juez}    ${activo}[id]
    List Should Not Contain Value    ${ids_juez}    ${arch}[id]

Bitacora integra tras varias operaciones y los hashes son unicos
    ${antes}=    GET On Session    api    /api/auditoria/verificar    headers=${H_ADMIN}    expected_status=200
    ${e}=    Crear Expediente Propio    ${H_SEC}    ${JUEZ}[id]
    ${body}=    Create Dictionary    tipo=escrito    detalle=Escrito de integridad
    POST On Session    api    /api/expedientes/${e}[id]/actuaciones    json=${body}    headers=${H_SEC}    expected_status=201
    Cambiar Estado    ${H_JUEZ}    ${e}[id]    en_tramite
    ${patch}=    Create Dictionary    descripcion=Editado para integridad
    PATCH On Session    api    /api/expedientes/${e}[id]    json=${patch}    headers=${H_SEC}    expected_status=200
    GET On Session    api    /api/expedientes/${e}[id]    headers=${H_SEC}    expected_status=200
    ${mal}=    Create Dictionary    username=no-existe-${e}[id]    password=x
    POST On Session    api    /api/auth/login    json=${mal}    expected_status=401
    ${despues}=    GET On Session    api    /api/auditoria/verificar    headers=${H_ADMIN}    expected_status=200
    Should Be True    ${despues.json()}[integra]
    Should Be Equal    ${despues.json()}[roto_en_id]    ${None}
    ${nuevos}=    Evaluate    ${despues.json()}[registros] - ${antes.json()}[registros]
    Should Be True    ${nuevos} >= 6
    ${params}=    Create Dictionary    limite=1000
    ${bit}=    GET On Session    api    /api/auditoria    params=${params}    headers=${H_ADMIN}    expected_status=200
    ${hashes}=    Evaluate    [r["hash"] for r in $bit.json()]
    ${unicos}=    Evaluate    len(set($hashes)) == len($hashes) and all(len(h) == 64 for h in $hashes)
    Should Be True    ${unicos}
    ${ids}=    Evaluate    [r["id"] for r in $bit.json()]
    ${desc}=    Evaluate    $ids == sorted($ids, reverse=True)
    Should Be True    ${desc}

*** Keywords ***
Preparar Datos
    Abrir Sesion API
    ${admin}=    Login Como    admin1
    ${sec}=    Login Como    secretario1
    ${juez}=    Crear Usuario Prueba    juez    ${admin}
    ${ajeno}=    Crear Usuario Prueba    juez    ${admin}
    ${abg}=    Crear Usuario Prueba    abogado    ${admin}
    ${hj}=    Login Como    ${juez}[username]
    ${haj}=    Login Como    ${ajeno}[username]
    ${yo}=    GET On Session    api    /api/auth/me    headers=${sec}
    ${exp}=    Crear Expediente Propio    ${sec}    ${juez}[id]
    GET On Session    api    /api/expedientes/${exp}[id]    headers=${hj}    expected_status=200
    Cambiar Estado    ${hj}    ${exp}[id]    en_tramite
    Set Suite Variable    ${H_ADMIN}    ${admin}
    Set Suite Variable    ${H_SEC}    ${sec}
    Set Suite Variable    ${H_JUEZ}    ${hj}
    Set Suite Variable    ${H_JUEZ_AJENO}    ${haj}
    Set Suite Variable    ${JUEZ}    ${juez}
    Set Suite Variable    ${ABG}    ${abg}
    Set Suite Variable    ${SEC_ID}    ${yo.json()}[id]
    Set Suite Variable    ${EXP}    ${exp}
