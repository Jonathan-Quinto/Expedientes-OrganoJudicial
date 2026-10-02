*** Settings ***
Documentation     PB-02 / HU-02 — Autenticación y control de acceso por roles.
Resource          resources/common.resource
Suite Setup       Abrir Sesion API
Test Tags         PB-02    seguridad

*** Test Cases ***
Login correcto devuelve token y rol
    ${body}=    Create Dictionary    username=secretario1    password=${PASSWORD}
    ${resp}=    POST On Session    api    /api/auth/login    json=${body}    expected_status=200
    Should Not Be Empty    ${resp.json()}[access_token]
    Should Be Equal    ${resp.json()}[rol]    secretario

Login con contrasena incorrecta es rechazado
    ${body}=    Create Dictionary    username=juez2    password=incorrecta
    POST On Session    api    /api/auth/login    json=${body}    expected_status=401

Endpoint protegido sin token responde 401
    GET On Session    api    /api/expedientes    expected_status=401

Token alterado es rechazado
    ${headers}=    Create Dictionary    Authorization=Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbjEifQ.firmafalsa
    GET On Session    api    /api/expedientes    headers=${headers}    expected_status=401

Juez no puede crear expedientes
    ${h}=    Login Como    juez1
    ${body}=    Create Dictionary    materia=civil    demandante=Intento Juez    demandado=Nadie Aqui
    POST On Session    api    /api/expedientes    json=${body}    headers=${h}    expected_status=403

Secretario no puede ver la bitacora de auditoria
    ${h}=    Login Como    secretario1
    GET On Session    api    /api/auditoria    headers=${h}    expected_status=403

Cuenta se bloquea tras cinco intentos fallidos
    [Documentation]    Mitigación de fuerza bruta. Se usa un usuario creado solo para esta prueba.
    ${admin}=    Login Como    admin1
    ${sufijo}=    Evaluate    __import__('secrets').token_hex(3)
    ${usuario}=    Set Variable    victima_${sufijo}
    ${nuevo}=    Create Dictionary    username=${usuario}    nombre=Usuario Fuerza Bruta    password=ClaveSegura-123    rol=secretario
    POST On Session    api    /api/usuarios    json=${nuevo}    headers=${admin}    expected_status=201
    ${malo}=    Create Dictionary    username=${usuario}    password=mala
    FOR    ${i}    IN RANGE    5
        POST On Session    api    /api/auth/login    json=${malo}    expected_status=401
    END
    ${bueno}=    Create Dictionary    username=${usuario}    password=ClaveSegura-123
    POST On Session    api    /api/auth/login    json=${bueno}    expected_status=423
