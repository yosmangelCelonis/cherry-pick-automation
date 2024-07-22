const {execSync} = require('child_process');
const process = require('process');
const handleError = (message)=>{
    console.error(`Error: ${message}`);
    process.exit(1);
    return false;
};

module.exports.cherryPick = async( branchPr, releaseType, releaseName, rootCausePr, jiraTicket, reasonFix) =>{
    

    try {
        const prJson = await JSON.parse( execSync(`gh pr view ${branchPr} --json author,mergeCommit,mergeable,mergedAt,number,title,url,id,labels`).toString());
        const rootCauseJson = await JSON.parse(execSync(`gh pr view ${rootCausePr} --json author,mergeCommit,mergeable,mergedAt,number,title,url,id,labels`).toString());

        console.log('PR_JSON:', prJson.id);
        console.log('ROOT_CAUSE_JSON:', rootCauseJson.id);
        if(prJson.id === rootCauseJson.id){
            handleError('The PR and the root cause have to be different');
        }
        if (prJson.mergedAt === null || prJson.mergeCommit === null || prJson.mergeable !== 'UNKNOWN') {
            handleError('The PR to merge has not been merged to main, please make sure that you are using the right PR id');
        }
        if (rootCauseJson.mergedAt === null || rootCauseJson.mergeCommit === null || rootCauseJson.mergeable !== 'UNKNOWN') {
            handleError('The root cause pr has not been merged to main, please make sure that you are using the right PR id');
        }

        execSync('git fetch --all');
        const branchList = execSync('git branch -r --list "*release*" --format "%(refname:lstrip=3)"').toString();

        if (!branchList.includes(`release/${releaseName}`)) {
            handleError("The branch doesn't exist, please make sure that you are using the correct name. Remember to only specify the name of the branch, for example release/BRANCH-NAME**");
        }

        // Verify release type
        if (releaseType === 'Emergency') {
            console.log('Emergency fix');
        }

        return true
    }catch (error) {
        handleError(error.message);
    }

}
