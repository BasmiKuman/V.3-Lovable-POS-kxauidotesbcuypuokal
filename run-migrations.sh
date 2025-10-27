#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Supabase Migration Runner${NC}"
echo -e "${BLUE}================================================${NC}\n"

SUPABASE_URL="https://mlwvrqjsaomthfcsmoit.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3ZycWpzYW9tdGhmY3Ntb2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU1ODU1NCwiZXhwIjoyMDc3MTM0NTU0fQ.G2vDaqFJyrbLovZ0p32sVFL0g8Ds-bUqot7pEdhBesU"

# Database connection string
DB_URL="${SUPABASE_URL/https:\/\//}"
DB_HOST="db.${DB_URL}"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo -e "${YELLOW}📋 Migration files found in supabase/migrations/${NC}\n"
ls -1 supabase/migrations/*.sql

echo -e "\n${YELLOW}🔧 Attempting to run migrations...${NC}\n"

# Try using psql if available
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} psql found, using PostgreSQL client\n"
    
    # Prompt for database password
    echo -e "${YELLOW}Please enter your database password:${NC}"
    echo -e "${BLUE}(You can find this in Supabase Dashboard > Settings > Database)${NC}"
    read -s DB_PASSWORD
    
    echo -e "\n${YELLOW}Running migrations...${NC}\n"
    
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f complete-migration.sql
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ Migrations completed successfully!${NC}\n"
    else
        echo -e "\n${RED}❌ Error running migrations${NC}\n"
        echo -e "${YELLOW}Please run migrations manually via Supabase Dashboard${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠️  psql not found${NC}\n"
    echo -e "${YELLOW}Please install PostgreSQL client or use Supabase Dashboard:${NC}\n"
    echo -e "  ${BLUE}1. Visit: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/editor${NC}"
    echo -e "  ${BLUE}2. Click on 'SQL Editor'${NC}"
    echo -e "  ${BLUE}3. Copy and paste contents of 'complete-migration.sql'${NC}"
    echo -e "  ${BLUE}4. Click 'Run'${NC}\n"
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}📊 Next Steps:${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "1. Verify tables created in Supabase Dashboard"
echo -e "2. Check RLS policies are enabled"
echo -e "3. Test application connection"
echo -e "${BLUE}================================================${NC}\n"
