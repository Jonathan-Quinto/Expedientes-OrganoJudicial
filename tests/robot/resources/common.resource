*** Settings ***
Documentation     Palabras clave compartidas por todas las suites.
Library           RequestsLibrary
Library           Collections

*** Variables ***
${BASE_URL}       http://localhost:8000
${PASSWORD}       Demo-Judicial-2026

*** Keywords ***
Abrir Sesion API
    Create Session    api    ${BASE_URL}    verify=${False}

Login Como
    [Documentation]    Hace login y devuelve el diccionario de headers con el token.
    [Arguments]    ${usuario}    ${password}=${PASSWORD}
    ${body}=    Create Dictionary    username=${usuario}    password=${password}
    ${resp}=    POST On Session    api    /api/auth/login    json=${body}    expected_status=200
    ${token}=    Set Variable    ${resp.json()}[access_token]
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}

Crear Expediente De Prueba
    [Documentation]    Lo crea el secretario y lo asigna al juez1.
    [Arguments]    ${headers}
    ${juez_id}=    Obtener Id De Juez    juez1    ${headers}
    ${body}=    Create Dictionary    materia=civil    demandante=Robot Demandante    demandado=Robot Demandado
    ...    descripcion=Creado por Robot Framework    juez_id=${juez_id}
    ${resp}=    POST On Session    api    /api/expedientes    json=${body}    headers=${headers}    expected_status=201
    RETURN    ${resp.json()}

Obtener Id De Juez
    [Arguments]    ${username}    ${headers}
    ${resp}=    GET On Session    api    /api/jueces    headers=${headers}    expected_status=200
    FOR    ${j}    IN    @{resp.json()}
        IF    '${j}[username]' == '${username}'    RETURN    ${j}[id]
    END
    Fail    No existe el juez ${username}
