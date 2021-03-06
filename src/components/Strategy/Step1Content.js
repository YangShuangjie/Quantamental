import React, { Component } from 'react'
import { Tree, Typography, Table, Button, Checkbox, Tag, DatePicker } from 'antd'
import { CloseCircleOutlined } from '@ant-design/icons'
import _ from 'lodash'
import moment from 'moment'
import { connect } from 'react-redux'

import { getUniverseCode } from '../../api'
import { saveUniverse, deleteMyPortfolio, notfollowFirm } from '../../redux/actions'

const { RangePicker } = DatePicker


const colorMapToKey = {
    b0: "magenta",
    b1: "red",
    b2: "lime",
    b3: "volcano",
    b4: "geekblue",
    b5: "purple",
}

let treeData = [
    {
        title: <Typography.Text strong>全部股票</Typography.Text>,
        key: 'a'
    },
    {
        title: <Typography.Text strong>指数组合</Typography.Text>,
        key: 'b',
        children: [
            {
                title: '上证综指',
                key: 'b0',
            },
            {
                title: '深圳成指',
                key: 'b1',
            },
            {
                title: '创业板指',
                key: 'b2',
            },
            {
                title: '上证50',
                key: 'b3',
            },
            {
                title: '沪深300',
                key: 'b4',
            },
            {
                title: '中证500',
                key: 'b5',
            },
        ],
    },
    // {
    //     title: <Typography.Text strong>我的组合</Typography.Text>,
    //     key: 'c',
    //     children: [
    //         {
    //             title: 'My Portfolio',
    //             key: 'c0',
    //         },
    //     ],
    // },
    // {
    //     title: <Typography.Text strong>我的关注</Typography.Text>,
    //     key: 'd',
    //     children: [
    //         {
    //             title: 'My follows',
    //             key: 'd0',
    //         },
    //     ],
    // },
]

@connect(state => ({...state.strategyInfo,...state.userInfo}), 
    { saveUniverse, deleteMyPortfolio, notfollowFirm })
class Step1Content extends Component {

    constructor(props) {
        super(props)
        const { myPortfolio, follows } = props
        this.state = {
            checkedKeys: [],
            expandedKeys: ['b'],
            myPortfolio,
            myFollows:follows,
            checkable: true,
            tableDataSource: [],
            deleteRows: [],
            isLoading: false
        }
    }

    onTreeExpand = (expandedKeys) => {
        this.setState({
            expandedKeys
        })
    }

    onTreeCheck = (checkedKeys, { checked, node }) => {
        const { key } = node

        if (checked) { //如果点击了则标记为check状态，并请求数据
            this.setState({ isLoading: true })
            getUniverseCode(key)
                .then(resp => {
                    this.setState({
                        isLoading: false,
                        checkedKeys, //包含全部的checkedKeys,自动更新的，无须手动concat
                        tableDataSource: this.handleTableDataSource(resp.data, key)
                    })
                })
        }
        else { //取消check状态，并移除数据
            const tableDataSource = this.state.tableDataSource.filter(
                obj => !obj.key.includes(key)
            )

            this.setState({
                checkedKeys,
                tableDataSource
            })
        }
    }

    onTreeSelect = (selectedKeys, { selected, node, ...props }) => {
        const { checked, key, children } = node

        if (!children) { //如果是叶子节点(最末级节点)
            if (!checked && selected) { //如果选中了则标记为check状态，并请求数据 [这里的!checked不能省略]
                this.setState({ isLoading: true })
                getUniverseCode(key)
                    .then(resp => {
                        this.setState({
                            isLoading: false,
                            checkedKeys: this.state.checkedKeys.concat(selectedKeys), //一开始是非checked状态，这里会变成checked状态
                            tableDataSource: this.handleTableDataSource(resp.data, key)
                        })
                    })
            }
            else { //如果取消选中则取消check状态，并移除数据
                const { checkedKeys, tableDataSource } = this.state
                this.setState({
                    checkedKeys: checkedKeys.filter(k => k !== key),
                    tableDataSource: tableDataSource.filter(obj => obj.key !== key)
                })
            }
        } else { //如果是父节点，选中则展开，取消选中则收起
            if (selected) {
                this.setState({
                    expandedKeys: this.state.expandedKeys.concat(selectedKeys)
                })
            } else {
                this.setState({
                    expandedKeys: this.state.expandedKeys.filter(k => k !== key)
                })
            }
        }
    }

    handleTableDataSource = (respData, key) => {
        const flatTreeData = _.flatMap(treeData, obj => {
            return obj.children ? obj.children : obj
        })

        const newData = respData.map(obj => {
            return {
                ...obj,
                portfolioName: _.find(flatTreeData, { key: obj.portfolio }).title,
                key //添加一个key作为标识，以方便操作
            }
        })

        const { tableDataSource } = this.state
        const newDataSource = _.union(tableDataSource, newData)
        return newDataSource
    }

    onDeleteRows = () => {
        const { tableDataSource, deleteRows } = this.state
        const restTableDataSource = _.difference(tableDataSource, deleteRows)
        this.setState({
            tableDataSource: restTableDataSource,
            checkedKeys: restTableDataSource.map(obj => obj.key),
            deleteRows: []
        })
    }

    componentDidMount() {
        this.onTreeCheck(['a'], {
            checked: true,
            node: {
                key: 'a'
            }
        })
    }

    //做好了后端这个可以不要
    componentDidUpdate(prevProps, prevState) {
        if (this.state.tableDataSource !== prevState.tableDataSource) {
            this.props.saveUniverse(this.state.tableDataSource)
        }
        if (this.props.myPortfolio !== prevProps.myPortfolio) {
            this.setState({
                checkable: this.props.myPortfolio.children.length !== 0,
                myPortfolio: this.props.myPortfolio
            })
        }

        if (this.props.follows !== prevProps.follows) {
            this.setState({
                checkable: this.props.follows.length !== 0,
                myFollows: this.props.follows
            })
        }
    }

    render() {

        const {
            checkedKeys,
            expandedKeys,
            myPortfolio,
            myFollows,
            checkable,
            tableDataSource,
            deleteRows,
            isLoading } = this.state

        const columns = [
            {
                title: '股票代码',
                dataIndex: 'stkcd'
            }, {
                title: '公司简称',
                dataIndex: 'name'
            }, {
                title: '所属组合',
                dataIndex: 'portfolioName',
                render: (value, record) => {
                    return (
                        <Tag color={colorMapToKey[record.portfolio]}>
                            {value}
                        </Tag>
                    )
                }
            }]

        const myPortfolioTreeData = {
            ...myPortfolio,
            title: <Typography.Text strong>我的组合</Typography.Text>,
            children: myPortfolio.children.map(child => {
                return {
                    title: (<span className='tree-title'>
                        {child.title}
                        <CloseCircleOutlined className='closeIcon'
                            onClick={() => this.props.deleteMyPortfolio(child.key)}
                        />
                    </span>),
                    key: child.key
                }
            })
        }
        const myFollowsTreeData = {
            title: <Typography.Text strong>我的关注</Typography.Text>,
            key: 'd',
            children: myFollows.map((stkcd,index) => {
                return {
                    title: (<span className='tree-title'>
                        {stkcd}
                        <CloseCircleOutlined className='closeIcon'
                            onClick={() => this.props.notfollowFirm(stkcd)}
                        />
                    </span>),
                    key: `d${index}`
                }
            })
        }

        const treeDatas = treeData.concat([myPortfolioTreeData, myFollowsTreeData])

        return (
            <div>
                <div style={{ marginLeft: '6%' }}>
                    样本期间:
                <RangePicker
                        style={{ marginLeft: 20, width: '20%' }}
                        placeholder={['开始时间', '结束时间']}
                        onChange={this.handlePickDate}
                        defaultValue={[moment('2010-12-31'), moment('2019-12-31')]}
                    />
                </div>

                <div style={{ display: 'flex', border: '2px solid #fafafa', width: "90%", margin: "5px auto ",height:"80%" }}>
                    <div className='tree-content'
                        style={{ flex: 0.4, borderRight: '2px solid #fafafa', paddingLeft: 30, paddingTop: 40 }}>
                        <Tree
                            checkable={checkable}
                            onExpand={this.onTreeExpand}
                            expandedKeys={expandedKeys}
                            onCheck={this.onTreeCheck}
                            checkedKeys={checkedKeys}
                            onSelect={this.onTreeSelect}
                            treeData={treeDatas}
                        />
                    </div>

                    <div className="edit-content"
                        style={{ display: 'flex', flexFlow: 'column', justifyContent: 'center', borderRight: '2px solid #fafafa', }}>
                        <Button
                            type={deleteRows[0] ? 'danger' : null}
                            onClick={this.onDeleteRows}
                        >删除</Button>
                        <Checkbox defaultChecked>过滤黑名单</Checkbox>
                    </div>

                    <div className='table-content' style={{ flex: 0.6 }}>
                        <Table
                            loading={isLoading}
                            size='small'
                            rowKey={record => record.stkcd}
                            scroll={{ y: 380 }}
                            pagination={{
                                size: 'small',
                                total: tableDataSource.length,
                                showTotal: (total) => `共${total}条`,
                                showSizeChanger: true,
                                defaultPageSize: 20,
                                hideOnSinglePage: true
                            }}
                            rowSelection={
                                {
                                    type: 'checkbox',
                                    onSelect: (record, selected, selectedRows) => this.setState({ deleteRows: selectedRows }),
                                    onSelectAll: (selected, selectedRows) => this.setState({ deleteRows: selectedRows })
                                }
                            }
                            dataSource={tableDataSource}
                            columns={columns}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default Step1Content