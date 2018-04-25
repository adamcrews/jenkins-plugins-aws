rpmbuild created by running:
```
docker run -v /tmp/rpm:/rpm -it lambci/lambda:build bash
yum -y install wget file-devel nss-devel popt-devel libarchive-devel db4-devel
wget https://github.com/rpm-software-management/rpm/archive/rpm-4.14.0-release.tar.gz
tar -zxvf rpm-4.14.0-release.tar.gz
cd rpm-rpm-4.14.0-release/
sh autogen.sh -prefix=/usr -without-lua LDFLAGS='-static' 
make -j4
make install
cp `which rpmbuild` /rpm/.
```
https://medium.com/@zercurity/building-packages-on-aws-lambda-c820ffea24a
