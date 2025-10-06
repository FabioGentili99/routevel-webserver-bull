#!/bin/bash

folder_name=$1
count=$2

for ((i=1; i<=$count; i++))
do
    name="test$i"
    mkdir -p "$folder_name$name"
done
