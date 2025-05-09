#!/bin/bash

find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "data-overlay-id"
