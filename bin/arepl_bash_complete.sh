declare -A MYMAP
MYMAP[foo]=bar
MYMAP[a b]="bar1 bar2"

echo ${MYMAP[foo]}
echo ${MYMAP[a b]}

SCRIPT=`realpath $_`
SCRIPTPATH=`dirname $SCRIPT`
source "${SCRIPTPATH}/arepl_bash_complete_data.sh"

contains() {
    for item in $1
    do
        if [ "$2" == "$item" ]; then
            return 1
        fi
    done

    return 0
}


contains "${ALL_CONTEXT}" "avm"
echo "res $?"

arepl_completions()
{    
    context=${COMP_WORDS[1]}
    command=${COMP_WORDS[2]}
    current=${COMP_WORDS[COMP_CWORD]}
        
    if [[ -n $context ]]; then
        contains "${ALL_CONTEXT}" "${context}"
        if [ "$?" == 1 ]
        then
            # echo "match: ${COMMAND_MAP[$context]}"
            COMPREPLY=($(compgen -W "${COMMAND_MAP[$context]}" -- "$current"))
        else
            COMPREPLY=($(compgen -W "${ALL_CONTEXT}" "$context"))
        fi
    elif [ -z "$command" ] 
    then
        COMPREPLY=($(compgen -W "${ALL_CONTEXT}" "$context"))
    fi


}

complete -F arepl_completions arepl