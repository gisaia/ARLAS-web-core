#!/bin/bash
set -e

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd)"

if  [ -z "$GITHUB_CHANGELOG_TOKEN"  ] ; then echo "Please set GITHUB_CHANGELOG_TOKEN environment variable"; exit -1; fi

if [[ ! -d ../ARLAS-web-contributors/ ]] ; then
    echo 'Directory "../ARLAS-web-contributors/" is not there, aborting.'
    exit
fi

if [[ ! -d ../ARLAS-web-components/ ]] ; then
    echo 'Directory "../ARLAS-web-components/" is not there, aborting.'
    exit
fi

if [[ ! -d ../ARLAS-wui-toolkit/ ]] ; then
    echo 'Directory "../ARLAS-wui-toolkit/" is not there, aborting.'
    exit
fi

if [[ ! -d ../ARLAS-d3/ ]] ; then
    echo 'Directory "../ARLAS-d3/" is not there, aborting.'
    exit
fi

npmlogin=`npm whoami`
if  [ -z "$npmlogin"  ] ; then echo "your are not logged on npm"; exit -1; else  echo "logged as "$npmlogin ; fi

level_version=("major" "minor" "patch")

usage(){
	echo "Usage: ./release.sh -core='1.0.0;major' -cont='1.1.0;minor' -comp='1.1.1;patch' -ref_branch=develop --stage=beta|rc|stable"
	echo " -core|--arlas-web-core     arlas-web-core version release,level of evolution"
	echo " -cont|--arlas-web-contributors      arlas-web-contributors version release, level of evolution"
	echo " -comp|--arlas-web-components    arlas-web-components version release, level of evolution"
	echo " -d3|--arlas-d3    arlas-d3 version release, level of evolution"
    echo " -tool|--arlas-wui-toolkit    arlas-wui-toolkit version release, level of evolution"
    echo " -s|--stage    Stage of the release : beta | rc | stable. If --stage is 'rc' or 'beta', there is no merge of develop into master (if -ref_branch=develop)"
    echo " -i|--stage_iteration=n, the released version will be : [x].[y].[z]-beta.[n] OR  [x].[y].[z]-rc.[n] according to the given --stage"
	echo " -ref_branch | --reference_branch  from which branch to start the release."
    echo "    Add -ref_branch=develop for a new official release"
    echo "    Add -ref_branch=x.x.x for a maintenance release"
	exit 1
}

contains(){
    local n=$#
    local value=${!n}
    for ((i=1;i < $#;i++)) {
        if [ "${!i}" == "${value}" ]; then
            echo "y"
            return 0
        fi
    }
    echo "n"
    return 1
}

checkInput(){
    IFS=';' read -ra TAB <<< "$1"
    TABLEN=${#TAB[@]}
    TWO=2
    if [ "$TABLEN" -ne "$TWO" ];
        then
            usage;
    else
        if [ $(contains "${level_version[@]}" "${TAB[1]}") == "n" ];
            then
                echo "Unknown level of evolution value : ${TAB[1]}"
                echo "Possible values : "
                echo "   level for versions : ${level_version[*]}"
                usage;
        else
            if ! [[ ${TAB[0]} =~ ^[0-9]*\.[0-9]*\.[0-9]*$ ]]
                then
                echo ""${TAB[0]}" version value is not valid. Format : vX.Y.Z in --prod mode"
                usage;
            fi
        fi
    fi

}


# ARGUMENTS $1 = VERSION  $2 = patch/minor/major $3 = PROJECT $4 ref_branch $5 stage $6 stage iteration (for beta & rc)
releaseProd(){
    local folder="web-core"
    local VERSION=$1
    local PROJECT=$3
    local BRANCH=$4
    local STAGE_LOCAL=$5
    local STAGE_ITERATION_LOCAL=$6
    if [ "${STAGE_LOCAL}" == "rc" ] || ["${STAGE_LOCAL}" == "beta"];
        then
        local VERSION="${VERSION}-${STAGE_LOCAL}.${STAGE_ITERATION_LOCAL}"
    fi
    if [ "$PROJECT" == "components" ];
        then
        cd ../ARLAS-web-components/
        local folder="web-components"
    elif [ "$PROJECT" == "d3" ];
        then
        cd ../ARLAS-d3/
        local folder="d3"
    elif [ "$PROJECT" == "contributors" ];
        then
        cd ../ARLAS-web-contributors/
        local folder="web-contributors"
    elif [ "$PROJECT" == "toolkit" ];
        then
        cd ../ARLAS-wui-toolkit/
        local folder="wui-toolkit"
    fi

    echo "=> Get "$BRANCH" branch of ARLAS-$folder project"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    echo "=> Test to lint and build the project on "$BRANCH" branch"
    npm --no-git-tag-version version ${VERSION}
     if [ "$PROJECT" == "components" ];
        then
        npm --no-git-tag-version --prefix projects/arlas-components version ${VERSION}
    elif [ "$PROJECT" == "toolkit" ];
        then
        npm --no-git-tag-version --prefix projects/arlas-toolkit version ${VERSION}
    fi

    echo "=> Build the ARLAS-$folder library"
    npm install
    npm run lint
    npm run build-release

    echo "=> Tag version $VERSION"    
    git add .
    commit_message_release="Release prod version $VERSION"
    git tag -a v"$VERSION" -m "$commit_message_release"
    git push origin v"$VERSION"

    echo "=> Generate CHANGELOG"
    docker run -it --rm -v "$(pwd)":/usr/local/src/your-app gisaia/github-changelog-generator:latest github_changelog_generator \
      -u gisaia -p ARLAS-"$folder" --token ${GITHUB_CHANGELOG_TOKEN} --no-pr-wo-labels --no-issues-wo-labels --no-unreleased \
      --issue-line-labels conf,documentation,CI,ALL,DONUT,RESULTLIST,POWERBARS,HISTOGRAM,MAP \
      --exclude-labels type:duplicate,type:question,type:wontfix,type:invalid \
      --bug-labels type:bug --enhancement-labels type:enhancement --breaking-labels type:breaking \
      --enhancement-label "**New stuff:**" --issues-label "**Miscellaneous:**" \
      --exclude-tags v3.1.2 --since-tag v4.0.0

    echo "  -- Remove tag to add generated CHANGELOG"
    git tag -d v"$VERSION"
    git push origin :v"$VERSION"

    echo "  -- Commit release version"
    git commit -a -m "$commit_message_release" --allow-empty
    git tag v"$VERSION"
    git push origin v"$VERSION"
    git push origin "$BRANCH"

    if [ "$PROJECT" == "components" ];
        then
        cp README-NPM.md dist/arlas-web-components/README.md
        cp LICENSE.txt dist/arlas-web-components/LICENSE
        cd dist/arlas-web-components/
    elif [ "$PROJECT" == "toolkit" ];
        then
        cp README-NPM.md dist/arlas-wui-toolkit/README.md
        cp LICENSE.txt dist/arlas-wui-toolkit/LICENSE
        cd dist/arlas-wui-toolkit/
    else
        cp README-NPM.md dist/README.md
        cp LICENSE.txt dist/LICENSE
        cp package-release.json  dist/package.json
        npm --no-git-tag-version --prefix dist version ${VERSION}
        cd dist
    fi
    echo "=> Publish to npm"
    if [ "${STAGE_LOCAL}" == "rc" ] || ["${STAGE_LOCAL}" == "beta"];
        then
        echo "  -- tagged as ${STAGE_LOCAL}"
        npm publish --tag=${STAGE_LOCAL}
    else 
        npm publish
    fi
    if [ "$PROJECT" == "components" ] || [ "$PROJECT" == "toolkit" ];
        then
        cd ../..
    elif [ "$PROJECT" == "d3" ] || [ "$PROJECT" == "contributors" ] || [ "$PROJECT" == "core" ];
        then
        cd ..
    fi
    rm -rf dist
    if [ "$BRANCH" == "develop" ] && [ "$STAGE_LOCAL" == "stable" ];
        then
        echo "=> Merge develop into master"
        git checkout master
        git pull origin master
        git merge origin/develop
        git push origin master

        git checkout develop
        git pull origin develop
        git rebase origin/master
    fi
    IFS='.' read -ra TAB <<< "$VERSION"
    major=${TAB[0]}
    minor=${TAB[1]}
    newminor=$(( $minor + 1 ))
    newDevVersion=${major}.${newminor}.0
    npm --no-git-tag-version version ""$newDevVersion"-dev0"
    git add .
    commit_message="update package.json to"-"$newDevVersion"
    git commit -m "$commit_message" --allow-empty
    git push origin "$BRANCH"
    echo "Well done :)"

}

# ARGUMENTS $1 = VERSION  $2 = patch/minor/major $3 = PROJECT $4 ref_branch $5 is beta $6 stage_iteration
release(){
    releaseProd $1 $2 $3 $4 $5 $6
}
STAGE="stable"
for i in "$@"
do
case $i in
    -core=*|--arlas-web-core=*)
    ARLAS_CORE="${i#*=}"
    shift # past argument=value
    ;;
    -cont=*|--arlas-web-contributors=*)
    ARLAS_CONT="${i#*=}"
    shift # past argument=value
    ;;
    -comp=*|--arlas-web-components=*)
    ARLAS_COMP="${i#*=}"
    shift # past argument=value
    ;;
    -d3=*|--arlas-d3=*)
    ARLAS_D3="${i#*=}"
    shift # past argument=value
    ;;
    -tool=*|--arlas-wui-toolkit=*)
    ARLAS_TOOL="${i#*=}"
    shift # past argument=value
    ;;
    -all=*|--global=*)
    ARLAS_ALL="${i#*=}"
    shift # past argument=value
    ;;
    -h|--help)
    ARLAS_HELP="true"
    shift # past argument=value
    ;;
    -ref_branch=*|--reference_branch=*)
    REF_BRANCH="${i#*=}"
    shift # past argument=value
    ;;
    -s=*|--stage=*)
    STAGE="${i#*=}"
    shift # past argument=value
    ;;
    -i=*|--stage_iteration=*)
    STAGE_ITERATION="${i#*=}"
    shift # past argument=value
    ;;
    *)
            # unknown option
    ;;
esac
done

if [ -z ${REF_BRANCH+x} ];
    then
        echo ""
        echo "###########"
        echo "-ref_branch is missing."
        echo "  Add -ref_branch=develop for a new official release"
        echo "  Add -ref_branch=x.x.x for a maintenance release"
        echo "###########"
        echo ""
        usage;
fi

if [ -z ${STAGE+x} ];
    then
        echo ""
        echo "###########"
        echo "-s=*|--stage* is missing."
        echo "  Add --stage=beta|rc|stable to define the release stage"
        echo "###########"
        echo ""
        usage;
fi

if [ "${STAGE}" != "beta" ] && [ "${STAGE}" != "rc" ] && [ "${STAGE}" != "stable" ];
    then
        echo ""
        echo "###########"
        echo "Stage ${STAGE} is invalid."
        echo "  Add --stage=beta|rc|stable to define the release stage"
        echo "###########"
        echo ""
        usage;
fi

if [ "${STAGE}" == "beta" ] || [ "${STAGE}" == "rc" ];
    then
        if [ -z ${STAGE_ITERATION+x} ];
            then
                echo ""
                echo "###########"
                echo "You chose to release this version as ${STAGE}."
                echo "--stage_iteration is missing."
                echo "  Add -i=n|--stage_iteration=n, the released version will be : [x].[y].[z]-${STAGE}.[n]"
                echo "###########"
                echo ""
                usage;
        fi
fi

if [ ! -z ${ARLAS_HELP+x} ];
    then
        usage;
fi

if [ ! -z ${ARLAS_CORE+x} ];
    then
        checkInput ${ARLAS_CORE}
        IFS=';' read -ra TABCORE <<< "$ARLAS_CORE"
        ARLAS_CORE_VERS="${TABCORE[0]}";
        ARLAS_CORE_LEVEL="${TABCORE[1]}";
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL}
        IFS=';' read -ra TABCORE <<< "$ARLAS_ALL"
        ARLAS_CORE_VERS="${TABCORE[0]}";
        ARLAS_CORE_LEVEL="${TABCORE[1]}";
fi

if [ ! -z ${ARLAS_CONT+x} ];
    then
        checkInput ${ARLAS_CONT}
        IFS=';' read -ra TABCONT <<< "$ARLAS_CONT"
        ARLAS_CONT_VERS="${TABCONT[0]}";
        ARLAS_CONT_LEVEL="${TABCONT[1]}";
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL}
        IFS=';' read -ra TABCONT <<< "$ARLAS_ALL"
        ARLAS_CONT_VERS="${TABCONT[0]}";
        ARLAS_CONT_LEVEL="${TABCONT[1]}";
fi

if [ ! -z ${ARLAS_COMP+x} ];
    then
        checkInput ${ARLAS_COMP}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_COMP"
        ARLAS_COMP_VERS="${TABCOMP[0]}";
        ARLAS_COMP_LEVEL="${TABCOMP[1]}";
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_ALL"
        ARLAS_COMP_VERS="${TABCOMP[0]}";
        ARLAS_COMP_LEVEL="${TABCOMP[1]}";
fi

if [ ! -z ${ARLAS_D3+x} ];
    then
        checkInput ${ARLAS_D3}
        IFS=';' read -ra TABD3 <<< "$ARLAS_D3"
        ARLAS_D3_VERS="${TABD3[0]}";
        ARLAS_D3_LEVEL="${TABD3[1]}";
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL}
        IFS=';' read -ra TABD3 <<< "$ARLAS_ALL"
        ARLAS_D3_VERS="${TABD3[0]}";
        ARLAS_D3_LEVEL="${TABD3[1]}";
fi

if [ ! -z ${ARLAS_TOOL+x} ];
    then
        checkInput ${ARLAS_TOOL}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_TOOL"
        ARLAS_TOOL_VERS="${TABCOMP[0]}";
        ARLAS_TOOL_LEVEL="${TABCOMP[1]}";
elif [ ! -z ${ARLAS_ALL+x} ];
    then
        checkInput ${ARLAS_ALL}
        IFS=';' read -ra TABCOMP <<< "$ARLAS_ALL"
        ARLAS_TOOL_VERS="${TABCOMP[0]}";
        ARLAS_TOOL_LEVEL="${TABCOMP[1]}";
fi

if [ ! -z ${ARLAS_CORE_VERS+x} ] && [ ! -z ${ARLAS_CORE_LEVEL+x} ];
    then
        echo "Release ARLAS-web-core  ${ARLAS_CORE_LEVEL} version                    : ${ARLAS_CORE_VERS}";
        release ${ARLAS_CORE_VERS} ${ARLAS_CORE_LEVEL} "core" ${REF_BRANCH} ${STAGE} ${STAGE_ITERATION}
fi

if [ ! -z ${ARLAS_CONT_VERS+x} ] && [ ! -z ${ARLAS_CONT_LEVEL+x} ];
    then
        echo "Release ARLAS-web-contributors  ${ARLAS_CONT_VERS} version                    : ${ARLAS_CONT_LEVEL}";
        release ${ARLAS_CONT_VERS} ${ARLAS_CONT_LEVEL} "contributors" ${REF_BRANCH} ${STAGE} ${STAGE_ITERATION}
fi

if [ ! -z ${ARLAS_COMP_VERS+x} ] && [ ! -z ${ARLAS_COMP_LEVEL+x} ];
    then
        echo "Release ARLAS-web-components  ${ARLAS_COMP_VERS} version                    : ${ARLAS_COMP_LEVEL}";
        release ${ARLAS_COMP_VERS} ${ARLAS_COMP_LEVEL} "components" ${REF_BRANCH} ${STAGE} ${STAGE_ITERATION}
fi

if [ ! -z ${ARLAS_D3_VERS+x} ] && [ ! -z ${ARLAS_D3_LEVEL+x} ];
    then
        echo "Release ARLAS-d3  ${ARLAS_D3_VERS} version                    : ${ARLAS_D3_LEVEL}";
        release ${ARLAS_D3_VERS} ${ARLAS_D3_LEVEL} "d3" ${REF_BRANCH} ${STAGE} ${STAGE_ITERATION}
fi

if [ ! -z ${ARLAS_TOOL_VERS+x} ] && [ ! -z ${ARLAS_TOOL_LEVEL+x} ];
    then
        echo "Release ARLAS-wui-toolkit  ${ARLAS_TOOL_VERS} version                    : ${ARLAS_TOOL_LEVEL}";
        release ${ARLAS_TOOL_VERS} ${ARLAS_TOOL_LEVEL} "toolkit" ${REF_BRANCH} ${STAGE} ${STAGE_ITERATION}
fi
