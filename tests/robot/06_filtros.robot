*** Settings ***
Documentation     HU-08 — Bandeja con filtros (estado, materia, juez, rango de plazo).
...               Nota: los parametros reales son plazo_desde / plazo_hasta (el doc dice fecha_desde/hasta).
Resource          resources/datos.resource
Suite Setup       Preparar Datos
Test Tags         HU-08    PB-01    filtros

*** Test Cases ***
Filtra por estado
    ${lista}=    Listar Expedientes    ${H_SEC}    estado=en_tramite    juez_id=${JUEZ}[id]
    ${ids}=    Ids De Lista    ${lista}
    List Should Contain Value    ${ids}    ${EXP_A}[id]
    List Should Not Contain Value    ${ids}    ${EXP_B}[id]
    FOR    ${e}    IN    @{lista}
        Should Be Equal    ${e}[estado]    en_tramite
    END

Filtra por estado sin acotar trae solo ese estado
    ${lista}=    Listar Expedientes    ${H_SEC}    estado=radicado
    FOR    ${e}    IN    @{lista}
        Should Be Equal    ${e}[estado]    radicado
    END
    ${ids}=    Ids De Lista    ${lista}
    List Should Contain Value    ${ids}    ${EXP_B}[id]

Filtra por materia
    ${lista}=    Listar Expedientes    ${H_SEC}    materia=${MATERIA}
    ${ids}=    Ids De Lista    ${lista}
    Should Be Equal As Integers    ${{len($ids)}}    2
    List Should Contain Value    ${ids}    ${EXP_A}[id]
    List Should Contain Value    ${ids}    ${EXP_B}[id]
    List Should Not Contain Value    ${ids}    ${EXP_C}[id]
    FOR    ${e}    IN    @{lista}
        Should Be Equal As Strings    ${e}[materia]    ${MATERIA}
    END

Filtra por juez
    ${lista}=    Listar Expedientes    ${H_SEC}    juez_id=${JUEZ}[id]
    ${ids}=    Ids De Lista    ${lista}
    Should Be Equal As Integers    ${{len($ids)}}    3
    FOR    ${e}    IN    @{lista}
        Should Be Equal As Integers    ${e}[juez_id]    ${JUEZ}[id]
    END
    ${otra}=    Listar Expedientes    ${H_SEC}    juez_id=${JUEZ2}[id]
    ${ids2}=    Ids De Lista    ${otra}
    Should Be Equal As Integers    ${{len($ids2)}}    1
    List Should Contain Value    ${ids2}    ${EXP_OTRO_JUEZ}[id]

Filtra por rango de plazo e ignora los que no tienen fecha limite
    ${d}=    Fecha Relativa    10
    ${h}=    Fecha Relativa    20
    ${lista}=    Listar Expedientes    ${H_SEC}    juez_id=${JUEZ}[id]    plazo_desde=${d}    plazo_hasta=${h}
    ${ids}=    Ids De Lista    ${lista}
    Should Be Equal As Integers    ${{len($ids)}}    1
    List Should Contain Value    ${ids}    ${EXP_B}[id]
    ${todos}=    Listar Expedientes    ${H_SEC}    juez_id=${JUEZ}[id]
    ${ids_todos}=    Ids De Lista    ${todos}
    List Should Contain Value    ${ids_todos}    ${EXP_C}[id]

Los filtros se combinan con AND
    ${lista}=    Listar Expedientes    ${H_SEC}    juez_id=${JUEZ}[id]    materia=${MATERIA}    estado=radicado
    ${ids}=    Ids De Lista    ${lista}
    Should Be Equal As Integers    ${{len($ids)}}    1
    List Should Contain Value    ${ids}    ${EXP_B}[id]

Juez no ve expedientes de otro juez aunque pida su juez_id
    ${lista}=    Listar Expedientes    ${H_JUEZ}    juez_id=${JUEZ2}[id]
    Should Be Empty    ${lista}

Estado invalido devuelve 422
    ${params}=    Create Dictionary    estado=inexistente
    GET On Session    api    /api/expedientes    params=${params}    headers=${H_SEC}    expected_status=422

Fecha con formato invalido devuelve 422
    ${params}=    Create Dictionary    plazo_desde=no-es-fecha
    GET On Session    api    /api/expedientes    params=${params}    headers=${H_SEC}    expected_status=422

*** Keywords ***
Preparar Datos
    Abrir Sesion API
    ${admin}=    Login Como    admin1
    ${sec}=    Login Como    secretario1
    ${juez}=    Crear Usuario Prueba    juez    ${admin}
    ${juez2}=    Crear Usuario Prueba    juez    ${admin}
    ${s}=    Sufijo Unico
    ${mat}=    Set Variable    mat${s}
    ${f5}=    Fecha Relativa    5
    ${f15}=    Fecha Relativa    15
    ${a}=    Crear Expediente Propio    ${sec}    ${juez}[id]    materia=${mat}    fecha_limite=${f5}
    ${b}=    Crear Expediente Propio    ${sec}    ${juez}[id]    materia=${mat}    fecha_limite=${f15}
    ${c}=    Crear Expediente Propio    ${sec}    ${juez}[id]    materia=otra${s}
    ${d}=    Crear Expediente Propio    ${sec}    ${juez2}[id]    materia=otra${s}
    ${hj}=    Login Como    ${juez}[username]
    Cambiar Estado    ${hj}    ${a}[id]    en_tramite
    Set Suite Variable    ${H_SEC}    ${sec}
    Set Suite Variable    ${H_JUEZ}    ${hj}
    Set Suite Variable    ${JUEZ}    ${juez}
    Set Suite Variable    ${JUEZ2}    ${juez2}
    Set Suite Variable    ${MATERIA}    ${mat}
    Set Suite Variable    ${EXP_A}    ${a}
    Set Suite Variable    ${EXP_B}    ${b}
    Set Suite Variable    ${EXP_C}    ${c}
    Set Suite Variable    ${EXP_OTRO_JUEZ}    ${d}
