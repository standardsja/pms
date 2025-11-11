#!/bin/bash
# Quick test of auth endpoints

echo "Testing /health..."
curl -s http://localhost:4000/health
echo -e "\n"

echo "Testing /health/auth..."
curl -s http://localhost:4000/health/auth  
echo -e "\n"

echo "Testing /auth/test-login..."
curl -s -X POST http://localhost:4000/auth/test-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice.requester@bsj.gov.jm"}'
echo -e "\n"

echo "Testing /api/auth/login..."
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice.requester@bsj.gov.jm","password":"Passw0rd!"}'
echo -e "\n"
